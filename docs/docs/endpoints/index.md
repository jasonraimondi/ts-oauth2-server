# OAuth 2.0 Endpoints

This server implements the following OAuth 2.0 endpoints, each supporting specific functionalities as defined in various RFC specifications:

## Core Endpoints

- [The `/token` Endpoint](./token.md)
- [The `/authorize` Endpoint](./authorize.md)

## Token Management Endpoints

- [The `/token/introspect` Endpoint](./introspect.md)
- [The `/token/revoke` Endpoint](./revoke.md)

:::info
All endpoints should be accessed over HTTPS to ensure secure communication.
:::
