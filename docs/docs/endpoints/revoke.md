---
title: /token/revoke
---

# The Revoke Endpoint

The `/token/revoke` endpoint is a back channel endpoint that revokes an existing token.

:::info
- Implementing this endpoint is optional
- This endpoint requires `TokenRepository#getByAccessToken` to be defined if using `token_type_hint=access_token`
:::

```ts
app.post("/token/revoke", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.revoke(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```

### Configure

Client credentials authentication is enabled by default. To disable, set `authenticateRevoke` to `false`.

```ts
const authoriztionServer = new AuthorizationServer(
  ...,
  {
    authenticateRevoke: false,
  }
);
```

### Request

A complete token revocation request will include the following parameters:

- **token** (required): The token to be revoked
- **token_type_hint** (optional): A hint about the type of the token submitted for revocation. Valid values are: `access_token`, `refresh_token`, `auth_code`. The hint is purely advisory — the server identifies the token's type from the token itself, so refresh tokens are revoked even when the hint is absent or wrong. An unrecognized hint is rejected with `unsupported_token_type`.

The request must be authenticated with the requesting client's own credentials (`client_id`, plus `client_secret` for confidential clients). Any client may revoke its own tokens — the client does **not** need to be authorized for the `client_credentials` grant.

A presented JWT is revoked only if its signature verifies against the server's configured `JwtService`; a forged or unverifiable token is silently ignored (still a `200`, per RFC 7009 §2.2). An expired access token can still be revoked — useful for killing its associated refresh token. With `useOpaqueRefreshTokens` enabled, opaque refresh token strings are resolved through `TokenRepository#getByRefreshToken` and revoke like any other token.

:::: details View sample revoke request

You can authenticate by passing the `client_id` and `client_secret` as a query string, or through basic auth.

::: code-group

```http [Query String]
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

When `authenticateRevoke = false`:

```ts
new AuthorizationServer(..., {
  authenticateRevoke: false,
})
```

```http
POST /token/revoke HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxxx
&token_type_hint=refresh_token
```
::::


### Response

| Status | When | Body |
| --- | --- | --- |
| `200` | The token was revoked — **or** it was invalid, unknown, expired, malformed, or owned by another client. Per [RFC 7009 §2.2](https://datatracker.ietf.org/doc/html/rfc7009#section-2.2) an invalid token is not an error, and staying silent avoids leaking token validity to other clients | Empty |
| `401` | Client authentication failed: missing or unknown `client_id`, wrong `client_secret`, or a confidential client presenting no secret ([RFC 7009 §2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1)) | `invalid_client` |
| `400` | The request is otherwise malformed, such as an unrecognized `token_type_hint` | OAuth error fields |

:::warning A `200` is not proof that authentication succeeded
An invalid **token** returns `200`; a failed **client authentication** returns `401`. The two failure modes are distinct — do not read the `200` as confirmation of either the token or the credentials.
:::

:::info Supports the following RFCs
[RFC7009 (OAuth 2.0 Token Revocation)](https://datatracker.ietf.org/doc/html/rfc7009)
:::
