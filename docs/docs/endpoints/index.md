# OAuth 2.0 Endpoints

This library supplies these OAuth 2.0 endpoints. Each endpoint obeys one or more RFC specifications.

## Core Endpoints

- [The `/token` Endpoint](./token.md)
- [The `/authorize` Endpoint](./authorize.md)

## Token Management Endpoints

- [The `/token/introspect` Endpoint](./introspect.md)
- [The `/token/revoke` Endpoint](./revoke.md)

## OpenID Connect Endpoints

- [The `/userinfo` Endpoint](./userinfo.md)
- [The `/.well-known/openid-configuration` Endpoint](./discovery.md)
- [OIDC conformance smoke test](./oidc_conformance.md)

:::info
Serve every endpoint over HTTPS.
:::
