---
title: /.well-known/openid-configuration
---

# The Discovery Endpoint

The discovery endpoint supplies the [OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata) document at `/.well-known/openid-configuration`. Each Client reads this Discovery Document and configures itself. The document gives the Issuer, the endpoint URLs, and the OIDC capabilities of the server.

`authorizationServer.openidConfiguration()` returns a `ResponseInterface`. Thus every adapter handles it in the usual way.

:::info
- You must enable OIDC. Set the `issuer` option and the `oidc` block on the `AuthorizationServer`.
- The library builds the document from the `issuer` option and the `oidc` block. You can cache the document.
:::

```ts
app.get("/.well-known/openid-configuration", (req: Express.Request, res: Express.Response) => {
  const oauthResponse = authorizationServer.openidConfiguration();
  return handleExpressResponse(res, oauthResponse);
});
```

### Response

The server sends the document with `Content-Type: application/json` and `Cache-Control: public, max-age=3600`. The library derives each capability field from the feature set of the first OIDC release:

| Field | Value | Notes |
| --- | --- | --- |
| `issuer` | Your `issuer` option | Security-critical. You cannot change it |
| `authorization_endpoint` | `oidc.authorizationEndpoint` | |
| `token_endpoint` | `oidc.tokenEndpoint` | |
| `userinfo_endpoint` | `oidc.userinfoEndpoint` | |
| `jwks_uri` | `oidc.jwksUri` | Security-critical. You cannot change it |
| `response_types_supported` | `["code"]` | The server supports `response_type=code` only |
| `grant_types_supported` | `["authorization_code", "refresh_token"]` | |
| `subject_types_supported` | `["public"]` | The first OIDC release has no pairwise subject |
| `id_token_signing_alg_values_supported` | `["RS256"]` | Security-critical. You cannot change it |
| `scopes_supported` | `["openid", "profile", "email", "address", "phone"]` | The list has no `offline_access` scope |
| `token_endpoint_auth_methods_supported` | `["client_secret_basic", "client_secret_post", "none"]` | |
| `code_challenge_methods_supported` | `["S256"]` | The grant accepts `plain` only when you set `requiresS256: false`, and the document never shows it |

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "userinfo_endpoint": "https://auth.example.com/userinfo",
  "jwks_uri": "https://auth.example.com/jwks",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "address", "phone"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post", "none"],
  "code_challenge_methods_supported": ["S256"]
}
```

### Add or Change the Metadata

The library has no scope registry. Thus you supply your own capabilities in the optional `metadata` field of the `oidc` block. These include your own scopes, the `claims_supported` field, and the ACR values. The library adds these fields to the document at the top level.

```ts
const authorizationServer = new AuthorizationServer(..., {
  issuer: "https://auth.example.com",
  oidc: {
    authorizationEndpoint: "https://auth.example.com/authorize",
    tokenEndpoint: "https://auth.example.com/token",
    userinfoEndpoint: "https://auth.example.com/userinfo",
    jwksUri: "https://auth.example.com/jwks",
    getUserClaims,
    metadata: {
      scopes_supported: ["openid", "profile", "email", "tenant"],
      claims_supported: ["sub", "email", "email_verified", "tenant"],
    },
  },
});
```

:::warning You cannot change the security-critical fields
You cannot change `issuer`, `jwks_uri`, or `id_token_signing_alg_values_supported`. A change to one of these fields makes the declared security of your server weaker, and gives you no warning. Thus the constructor throws when your `metadata` contains one of them.
:::

:::info Supports the following specifications
[OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
:::
