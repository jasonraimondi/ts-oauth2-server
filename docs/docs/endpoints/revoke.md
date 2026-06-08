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
- **token_type_hint** (optional): A hint about the type of the token submitted for revocation. Valid values are: `access_token`, `refresh_token`, `auth_code`

The request must be authenticated with the requesting client's own credentials (`client_id`, plus `client_secret` for confidential clients). Any client may revoke its own tokens — the client does **not** need to be authorized for the `client_credentials` grant.

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

The authorization server will respond with:

- An HTTP 200 (OK) status code if the token was successfully revoked, or if the submitted token is invalid, unknown, expired, or malformed. Per [RFC 7009 §2.2](https://datatracker.ietf.org/doc/html/rfc7009#section-2.2) an invalid token is **not** an error. A 200 is also returned when an authenticated client submits a token it does not own — the token is left untouched, which avoids leaking token validity to other clients.
- An HTTP 401 (Unauthorized) status code with an `invalid_client` error if client authentication fails — a missing or invalid `client_id`, a wrong `client_secret`, or a confidential client that presents no secret. Per [RFC 7009 §2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1) a failed client authentication is refused with an [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) error response, even though an invalid *token* is not.
- An HTTP 400 (Bad Request) status code if the request is otherwise invalid or malformed (for example, an unsupported `token_type_hint`).

The response body is empty for a 200. For error responses the server includes the OAuth 2.0 error fields.

:::warning A failed client authentication is a `401`, not a silent `200`
Distinguish the two failure modes: an **invalid token** (with valid or disabled client authentication) returns `200`, but a **failed client authentication** returns `401 invalid_client`. A client that fails to authenticate therefore receives an error rather than a misleading success — do not read a `200` as confirmation that authentication succeeded.
:::

:::info Supports the following RFCs
[RFC7009 (OAuth 2.0 Token Revocation)](https://datatracker.ietf.org/doc/html/rfc7009)
:::
