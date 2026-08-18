---
title: /userinfo
---

# The UserInfo Endpoint

The `/userinfo` endpoint returns the Scope-Derived Claims of the end-user for an Access Token ([OpenID Connect Core §5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)). The Client sends the Access Token that it received from the [`/token`](./token.md) endpoint, and gets the claims that the granted scopes permit.

`authorizationServer.userInfo(req)` returns a `ResponseInterface`. This is a `200` with the claims, or an [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) bearer error. Thus every adapter handles it in the usual way.

:::info
- You must enable OIDC. Set the `issuer` option, and the `oidc` block with `getUserClaims`.
- The server must have granted the `openid` scope for the Access Token.
- The `AccessTokenVerifier` verifies the Access Token. It pins the signing algorithm, it makes the `typ: at+jwt` JOSE header mandatory, and it checks the Issuer.
:::

```ts
app.get("/userinfo", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.userInfo(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```

### Request

The server reads the Access Token from two places, in this sequence:

1. The `Authorization: Bearer <token>` header.
2. The `access_token` parameter in the form body.

The server does not accept the query parameter from RFC 6750 §2.3. A token in a URL goes into the access logs, the browser history, and the `Referer` headers.

```http
GET /userinfo HTTP/1.1
Host: auth.example.com
Authorization: Bearer <access_token>
```

### Response

A correct response is a `200 OK` with `Content-Type: application/json` and `Cache-Control: no-store`. The body holds the `sub` and each claim that the granted scopes permit. The [scope-to-claim map](https://openid.net/specs/openid-connect-core-1_0.html#ScopeClaims) shows which scope permits which claim. Your `getUserClaims(subject)` callback supplies the attributes, and the library then removes the claims that the scopes do not permit.

```json
{
  "sub": "248289761001",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "email_verified": true
}
```

:::warning The server controls `sub`
The `sub` claim always comes from the canonical subject of the Access Token, and the library writes it last. Thus your `getUserClaims` callback cannot change it. This `sub` is identical to the `sub` in the ID Token.
:::

### Errors

Each error obeys RFC 6750, and carries a `WWW-Authenticate: Bearer` challenge.

| Condition | Status | `WWW-Authenticate` |
| --- | --- | --- |
| Missing, malformed, expired, wrong `typ`, wrong `iss`, or revoked token | `401` | `Bearer error="invalid_token", error_description="<reason>"` |
| Valid token without the `openid` scope | `403` | `Bearer error="insufficient_scope", error_description="openid scope required", scope="openid"` |

The server rejects a revoked Access Token with `invalid_token`, but only when your token repository has [`getByAccessToken`](../getting_started/repositories.md#token-repository). With `getByAccessToken` alone, a token is revoked when you delete it from storage, or when its stored expiry passes.

If your `revoke()` marks a row as revoked, and keeps the row with a future expiry, also write the optional [`isAccessTokenRevoked`](../getting_started/repositories.md#token-repository) method. UserInfo calls it before it returns the claims.

:::info The audience policy in v1
Version 1 accepts each Access Token that this server issued, and it identifies these tokens by the `iss` claim. It makes no audience check. An audience check for one resource server comes later, when the `audience` parameter has a place in the Discovery Document.
:::

:::info Supports the following specifications
[OpenID Connect Core 1.0 §5.3 (UserInfo Endpoint)](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo), [RFC 6750 (Bearer Token Usage)](https://datatracker.ietf.org/doc/html/rfc6750)
:::
