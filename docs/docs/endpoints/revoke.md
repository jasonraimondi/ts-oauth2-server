---
title: /token/revoke
---

# The Revoke Endpoint (optional)

The `/token/revoke` endpoint revokes a token that the server issued.

The Client calls this endpoint directly, from its server to your server. The browser is not part of the request, and thus the Client can safely send its client secret.

:::info
- You must define `TokenRepository#getByAccessToken` to revoke an Access Token.
:::

```ts
import {
  requestFromExpress,
  handleExpressResponse,
  handleExpressError,
} from "@jmondi/oauth2-server/express";

app.post("/token/revoke", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.revoke(requestFromExpress(req));
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```

### Configure

The endpoint authenticates the client credentials by default. To stop this, set `authenticateRevoke` to `false`.

```ts
const authorizationServer = new AuthorizationServer(
  ...,
  {
    authenticateRevoke: false,
  }
);
```

### Request

A complete revocation request contains these parameters:

- **token** (required): The token to revoke.
- **token_type_hint** (optional): The permitted values are `access_token`, `refresh_token`, and `auth_code`. For an Access Token and a Refresh Token the hint is only advisory, because the server identifies the type of the token from the token itself. Thus the server revokes a Refresh Token even when the hint is absent or incorrect. But you must send `token_type_hint=auth_code` to revoke an authorization code, because the server selects the handler from this one hint. The server rejects an unknown hint with `unsupported_token_type`.

The Client authenticates with its own credentials: the `client_id`, and also the `client_secret` for a Confidential Client. Each Client can revoke its own tokens. The Client does **not** need permission for the `client_credentials` grant.

The server revokes a JWT only after the signature verifies against the configured `JwtService`. The server ignores a forged token, and still returns a `200` (RFC 7009 §2.2). The server can also revoke an expired Access Token, which lets you revoke the related Refresh Token.

If you set `useOpaqueRefreshTokens`, the server reads each opaque Refresh Token with `TokenRepository#getByRefreshToken`, and then revokes it in the usual way.

:::: details View sample revoke request

You can authenticate by passing the `client_id` and `client_secret` in the request body, or through basic auth.

::: code-group

```http [Request Body]
POST /token/revoke HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxxx
&token_type_hint=refresh_token
&client_id=xxxxxxxxxx
&client_secret=xxxxxxxxxx
```

```http [Basic Auth]
POST /token/revoke HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic MTpzdXBlci1zZWNyZXQtc2VjcmV0

token=xxxxxxxxxx
&token_type_hint=refresh_token
```

:::

When you set `authenticateRevoke` to `false` (see [Configure](#configure)), send only the token:

```http
POST /token/revoke HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxxx
&token_type_hint=refresh_token
```
::::


### Response

| Status | Condition | Body |
| --- | --- | --- |
| `200` | The server revoked the token. The server also returns `200` when the token is invalid, unknown, expired, malformed, or owned by a different Client. [RFC 7009 §2.2](https://datatracker.ietf.org/doc/html/rfc7009#section-2.2) does not classify an invalid token as an error. The one status also keeps the validity of a token secret from other Clients | Empty |
| `401` | The client authentication failed. The `client_id` is absent or unknown, the `client_secret` is incorrect, or a Confidential Client sent no secret ([RFC 7009 §2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1)) | `invalid_client` |
| `400` | The request is malformed for a different reason, for example an unknown `token_type_hint` | OAuth error fields |

:::warning A `200` does not show that the authentication was correct
An invalid **token** gives a `200`. A failed **client authentication** gives a `401`. These two conditions are different. Do not read a `200` as proof that the token or the credentials were correct.
:::

:::info Supports the following RFCs
[RFC7009 (OAuth 2.0 Token Revocation)](https://datatracker.ietf.org/doc/html/rfc7009)
:::
