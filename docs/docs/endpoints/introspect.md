---
title: /token/introspect
---

# The Introspect Endpoint (optional)

The `/token/introspect` endpoint returns the Active state and the metadata of a token ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)). This endpoint does not revoke a token. To revoke a token, use the [`/token/revoke`](./revoke.md) endpoint.

The Client calls this endpoint directly, from its server to your server. The browser is not part of the request, and thus the Client can safely send its client secret.

:::info
- You must define `TokenRepository#getByAccessToken` to introspect an Access Token.
:::

```ts
import {
  requestFromExpress,
  handleExpressResponse,
  handleExpressError,
} from "@jmondi/oauth2-server/express";

app.post("/token/introspect", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.introspect(requestFromExpress(req));
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```

### Configure

The endpoint authenticates the client credentials by default. To stop this, set `authenticateIntrospect` to `false`.

```ts
const authoriztionServer = new AuthorizationServer(
  ...,
  {
    authenticateIntrospect: false,
  }
);
```

By default, only a **Confidential Client** can introspect a token. [RFC 7662 §4](https://datatracker.ietf.org/doc/html/rfc7662#section-4) recommends that a protected resource is "specifically authorized", and a `client_secret` gives this authorization. The server rejects a Public Client with `401 invalid_client`.

To let a Public Client introspect a token, set `introspectionRequiresConfidentialClient` to `false`. This option does nothing when `authenticateIntrospect` is `false`.

```ts
const authorizationServer = new AuthorizationServer(
  ...,
  {
    introspectionRequiresConfidentialClient: false,
  }
);
```

### Request

A complete introspection request contains these parameters:

- **token** (required): The token to introspect.
- **token_type_hint** (optional): The permitted values are `access_token`, `refresh_token`, and `auth_code`. The hint is only advisory, because the server identifies the type of the token from the token itself. Thus the server finds a Refresh Token even when the hint is absent or incorrect. The server rejects an unknown hint with `unsupported_token_type`. This endpoint does not introspect an authorization code; a request with `token_type_hint=auth_code` reports `{"active": false}`.

By default, the Client authenticates with the credentials of a Confidential Client: the `client_id` and the `client_secret`. See [Configure](#configure).

An authenticated Client can introspect **any** token. A resource server usually makes this call. Thus the endpoint does not limit a Client to the tokens that the server issued to that Client. The Client does **not** need permission for the `client_credentials` grant.

:::: details View sample introspect request

Send the `client_id` and the `client_secret` in the request body, or use basic authentication.

::: code-group

```http [Request Body]
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

When you set `authenticateIntrospect` to `false` (see [Configure](#configure)), send only the token:

```http
POST /token/introspect HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxxx
&token_type_hint=refresh_token
```
::::

### Token Verification and the Active State

The server trusts the claims of a JWT only after the signature verifies against the configured `JwtService`. If the signature is incorrect, the server treats the token as unknown and reports `{"active": false}`. The server does not report an error. The server does the same for a correctly formed token when its record is no longer in storage.

The server reports `active: true` only from its own stored state. The record of the token must exist, the stored expiry must be in the future, and the token must not be revoked.

The server finds a revocation with two repository methods. It calls `TokenRepository#isRefreshTokenRevoked` for a Refresh Token, and the optional `TokenRepository#isAccessTokenRevoked` for an Access Token. Write the optional method if your `revoke()` marks a record as revoked. You do not need it if your `revoke()` deletes the record or sets the expiry to zero.

If you set `useOpaqueRefreshTokens`, the server reads each opaque Refresh Token with `TokenRepository#getByRefreshToken`, and then introspects it in the usual way.

### Response

The authorization server returns a JSON object with these fields:

- **active** (required): A boolean. It shows if the token is Active.
- **scope** (optional): The scopes of the token, separated by spaces.
- **client_id** (optional): The Client that requested the token.
- **username** (optional): A readable name for the resource owner who authorized the token.
- **token_type** (optional): The type of the token, for example `Bearer`.
- **exp** (optional): The time when the token expires.
- **iat** (optional): The time when the server issued the token.
- **nbf** (optional): The time before which no server accepts the token.
- **sub** (optional): The subject of the token.
- **aud** (optional): The audience of the token.
- **iss** (optional): The Issuer of the token.
- **jti** (optional): The unique identifier of the token.

The response can contain more fields.

The `active`, `scope`, `client_id`, and `token_type` fields always come from the stored state of the server. The other fields come from the claims of the verified token.

### Call the Endpoint

```ts
import { base64encode } from "@jmondi/oauth2-server";

const response = await fetch("/token/introspect", {
  method: "POST",
  headers: {
    Authorization: "Basic " + base64encode(`${clientId}:${clientSecret}`),
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ token }),
});
const { active, scope, client_id, sub } = await response.json();
```

You can also send the `client_id` and the `client_secret` in the form body, in place of the `Authorization` header.

:::info Supports the following RFCs
[RFC7662 (OAuth 2.0 Token Introspection)](https://datatracker.ietf.org/doc/html/rfc7662)
:::
