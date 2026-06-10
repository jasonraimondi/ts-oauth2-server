---
title: /token/introspect
---

# The Introspect Endpoint

The `/token/introspect` endpoint is a back channel endpoint that returns the active state and metadata of a given token (per [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)). It does not revoke tokens — for revocation use the [`/token/revoke`](./revoke.md) endpoint. The introspect endpoint requires the `TokenRepository#getByAccessToken` method to introspect access tokens.

:::info
- Implementing this endpoint is optional
- This endpoint requires `TokenRepository#getByAccessToken` to be defined to introspect access tokens
:::

```ts
app.post("/token/introspect", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.introspect(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```

### Configure

Client credentials authentication is enabled by default. To disable, set `authenticateIntrospect` to `false`.

```ts
const authoriztionServer = new AuthorizationServer(
  ...,
  {
    authenticateIntrospect: false,
  }
);
```

By default, only **confidential clients** (those registered with a `client_secret`) may introspect, per [RFC 7662 §4](https://datatracker.ietf.org/doc/html/rfc7662#section-4) (protected resources should be "specifically authorized"). A public client is rejected with `401 invalid_client`. To allow public clients to introspect, set `introspectionRequiresConfidentialClient` to `false`. This option has no effect when `authenticateIntrospect` is `false`.

```ts
const authorizationServer = new AuthorizationServer(
  ...,
  {
    introspectionRequiresConfidentialClient: false,
  }
);
```

### Request

A complete token introspection request will include the following parameters:

- **token** (required): The string value of the token to be introspected
- **token_type_hint** (optional): A hint about the type of the token submitted for introspection. Valid values are: `access_token` and `refresh_token`. The hint is purely advisory — the server identifies the token's type from the token itself, so refresh tokens are found even when the hint is absent or wrong. An unrecognized hint is rejected with `unsupported_token_type`.

By default the request must be authenticated with a registered **confidential** client's credentials (`client_id` + `client_secret`); public clients are rejected (see [Configure](#configure)). The authenticated client may introspect **any** token — introspection is a back-channel call (typically from a resource server) and is not scoped to tokens issued to the requesting client. The client does **not** need to be authorized for the `client_credentials` grant.

:::: details View sample introspect request

You can authenticate by passing the `client_id` and `client_secret` as a query string, or through basic auth.

::: code-group

```http [Query String]
POST /token/introspect HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxxx
&token_type_hint=refresh_token
&client_id=xxxxxxxxxx
&client_secret=xxxxxxxxxx
```

```http [Basic Auth]
POST /token/introspect HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic MTpzdXBlci1zZWNyZXQtc2VjcmV0

token=xxxxxxxxxx
&token_type_hint=refresh_token
```

:::

When `authenticateIntrospect = false`:

```ts
new AuthorizationServer(..., {
  authenticateIntrospect: false,
})
```

```http
POST /token/introspect HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxxx
&token_type_hint=refresh_token
```
::::

### Token verification and `active`

A presented JWT's claims are trusted only after its signature verifies against the server's configured `JwtService` — a token with an invalid or unverifiable signature is treated as unknown and reported `{"active": false}`, never as an error. The same applies to a well-formed token whose record no longer exists in storage.

`active: true` means the server's **stored** state says so: the token's persisted record exists, its stored expiry is in the future, and it has not been revoked. Revocation is detected through `TokenRepository#isRefreshTokenRevoked` for refresh tokens and the optional `TokenRepository#isAccessTokenRevoked` for access tokens — implement the latter if your `revoke()` marks records revoked rather than deleting them or zeroing their expiry.

With `useOpaqueRefreshTokens` enabled, opaque refresh token strings are resolved through `TokenRepository#getByRefreshToken` and introspect like any other token.

### Response

The authorization server will respond with a JSON object containing the following fields:

- **active** (required): A boolean value indicating whether the token is currently active
- **scope** (optional): A space-separated list of scopes associated with the token
- **client_id** (optional): The client identifier for the OAuth 2.0 client that requested this token
- **username** (optional): A human-readable identifier for the resource owner who authorized this token
- **token_type** (optional): The type of the token (e.g., `Bearer`)
- **exp** (optional): The timestamp indicating when the token will expire
- **iat** (optional): The timestamp indicating when the token was issued
- **nbf** (optional): The timestamp indicating when the token is not to be used before
- **sub** (optional): The subject of the token
- **aud** (optional): The intended audience of the token
- **iss** (optional): The issuer of the token
- **jti** (optional): The unique identifier for the token

Additional fields may be included in the response.

`active`, `scope`, `client_id`, and `token_type` always reflect the server's stored state for the token; the remaining fields echo the verified token's claims.

The client authenticates with its credentials (`client_id`, plus `client_secret` for confidential clients).

::: code-group

```ts [Auth Using Headers]
import { base64encode } from "@jmondi/oauth2-server";

const basicAuth = "Basic " + base64encode(`${clientId}:${clientSecret}`);
const response = await fetch("/token/introspect", {
  method: "POST",
  headers: {
    Authorization: basicAuth,
  },
  body: JSON.stringify({
    token: token,
  }),
});
await response.json()
```

```ts [Auth Using Body]
const response = await fetch("/token/introspect", {
  method: "POST",
  body: JSON.stringify({
    token: token,
    client_id: clientId,
    client_secret: clientSecret,
  }),
});
await response.json()
```

:::

:::info Supports the following RFCs
[RFC7662 (OAuth 2.0 Token Introspection)](https://datatracker.ietf.org/doc/html/rfc7662)
:::
