---
title: Glossary
---

# Glossary

### Resource Server

The OAuth 2.0 name for your API server. The resource server receives the authenticated requests after a Client gets an Access Token.

### Client

An application that requests access to the resource server. Each Client must have an [OAuthClient](../getting_started/entities.md#client-entity) entity. In OIDC documents the Client is also called the Relying Party (RP). The two names identify the same thing.

### Confidential Client

A Client with a `client_secret`. Only a Confidential Client can [introspect a token](../endpoints/introspect.md) by default.

### Public Client

A Client with no `client_secret`, for example a browser application that uses PKCE. A Public Client can get and revoke its own tokens.

### Front Channel

A request that goes through the browser of the user, as a redirect. The [`/authorize`](../endpoints/authorize.md) endpoint is the only front channel endpoint in this library.

Each parameter of a front channel request is visible in the URL. The browser history keeps it, your access logs record it, and the user can change it. Thus a Client must never send its secret on the front channel.

### Back Channel

A request that a Client sends directly to your server, with no browser. The [`/token`](../endpoints/token.md), [`/token/revoke`](../endpoints/revoke.md), and [`/token/introspect`](../endpoints/introspect.md) endpoints are back channel endpoints.

No third party sees a back channel request. Thus a Client can safely send its secret on the back channel.

[access_token_response]: https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/ "Access Token Response"
[client_credentials]: https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/ "Client Credentials Grant"
