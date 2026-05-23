---
title: /userinfo
---

# The UserInfo Endpoint

The `/userinfo` endpoint returns the end-user's scope-derived claims for a presented OIDC access token, per [OpenID Connect Core §5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo). The relying party presents the access token it received from the [`/token`](./token.md) endpoint and receives the claims allowed by the granted scopes.

`authorizationServer.userInfo(req)` returns a plain `ResponseInterface` — a `200` with the claims, or an [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) bearer error — so every adapter handles it unchanged.

:::info
- This endpoint requires OIDC to be enabled (set the `issuer` option and the `oidc` config block with `getUserClaims`).
- The presented access token must have been granted the `openid` scope.
- Access-token verification is delegated to the `AccessTokenVerifier`, which pins the signing algorithm, requires the `typ: at+jwt` JOSE header, and checks the issuer.
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

The access token is read, in order, from:

1. the `Authorization: Bearer <token>` header,
2. an `access_token` form body parameter, or
3. an `access_token` query parameter.

```http
GET /userinfo HTTP/1.1
Host: auth.example.com
Authorization: Bearer <access_token>
```

### Response

A successful response is `200 OK` with `Content-Type: application/json` and `Cache-Control: no-store`. The body is the `sub` plus the claims permitted by the granted scopes (see the [scope-to-claim mapping](https://openid.net/specs/openid-connect-core-1_0.html#ScopeClaims)). The `getUserClaims(subject)` callback supplies the raw attributes; the library filters them by the granted scopes.

```json
{
  "sub": "248289761001",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "email_verified": true
}
```

:::warning sub is authoritative
`sub` is always taken from the access token's canonical subject and applied last, so a consumer `getUserClaims` implementation can never overwrite it. It is byte-for-byte identical to the `sub` in the issued ID token.
:::

### Errors

Errors follow RFC 6750 and carry a `WWW-Authenticate: Bearer` challenge.

| Condition | Status | `WWW-Authenticate` |
| --- | --- | --- |
| Missing, malformed, expired, wrong `typ`, wrong `iss`, or revoked token | `401` | `Bearer error="invalid_token", error_description="<reason>"` |
| Valid token without the `openid` scope | `403` | `Bearer error="insufficient_scope", error_description="openid scope required", scope="openid"` |

A revoked access token is rejected as `invalid_token` when the token repository implements [`getByAccessToken`](../getting_started/repositories).

:::info v1 audience policy
v1 accepts any access token this server issued (verified by the `iss` match) without an additional audience check. A resource-server-scoped audience check is a forward-compatible addition once the `audience` parameter has a discovery story.
:::

:::info Supports the following specifications
[OpenID Connect Core 1.0 §5.3 (UserInfo Endpoint)](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo), [RFC 6750 (Bearer Token Usage)](https://datatracker.ietf.org/doc/html/rfc6750)
:::
