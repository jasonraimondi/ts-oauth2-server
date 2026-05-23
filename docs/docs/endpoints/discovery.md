---
title: /.well-known/openid-configuration
---

# The Discovery Endpoint

The discovery endpoint serves the [OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata) document at `/.well-known/openid-configuration`. Relying parties fetch it to auto-configure: it advertises the issuer, the endpoint URLs, and the server's OIDC capabilities.

`authorizationServer.openidConfiguration()` returns a plain `ResponseInterface`, so every adapter handles it without extra wiring.

:::info
- This endpoint requires OIDC to be enabled (set the `issuer` option and the `oidc` config block on the `AuthorizationServer`).
- The document is built from the `issuer` option and the `oidc` config block; it is safe to cache.
:::

```ts
app.get("/.well-known/openid-configuration", (req: Express.Request, res: Express.Response) => {
  const oauthResponse = authorizationServer.openidConfiguration();
  return handleExpressResponse(res, oauthResponse);
});
```

### Response

The document is served with `Content-Type: application/json` and `Cache-Control: public, max-age=3600`. Capability fields are auto-derived from the v1 feature set:

| Field | Value | Notes |
| --- | --- | --- |
| `issuer` | your `issuer` option | Security-critical — not overridable |
| `authorization_endpoint` | `oidc.authorizationEndpoint` | |
| `token_endpoint` | `oidc.tokenEndpoint` | |
| `userinfo_endpoint` | `oidc.userinfoEndpoint` | |
| `jwks_uri` | `oidc.jwksUri` | Security-critical — not overridable |
| `response_types_supported` | `["code"]` | Only `response_type=code` is supported |
| `grant_types_supported` | `["authorization_code", "refresh_token"]` | |
| `subject_types_supported` | `["public"]` | Pairwise subjects are out of scope in v1 |
| `id_token_signing_alg_values_supported` | `["RS256"]` | Security-critical — not overridable |
| `scopes_supported` | `["openid", "profile", "email", "address", "phone"]` | `offline_access` is intentionally absent |
| `token_endpoint_auth_methods_supported` | `["client_secret_basic", "client_secret_post", "none"]` | |
| `code_challenge_methods_supported` | `["S256"]` | The grant still accepts `plain` for backward compatibility but discovery does not advertise it |

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

### Adding or overriding metadata

The library has no scope registry, so non-standard capabilities (custom scopes, `claims_supported`, ACR values) are supplied through the optional `metadata` field on the `oidc` config block. It is shallow-merged into the generated document.

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

:::warning Security-critical fields cannot be overridden
`issuer`, `jwks_uri`, and `id_token_signing_alg_values_supported` are **not** overridable — a metadata override that weakened them would silently degrade the server's advertised security posture. Setting any of these in `metadata` throws at construction time.
:::

:::info Supports the following specifications
[OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
:::
