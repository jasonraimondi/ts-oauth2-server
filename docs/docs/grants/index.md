---
title: OAuth 2.0 Grants
---

# Grants

A grant is one procedure that a [Client](../Extras/glossary.md#client) uses to get an Access Token. The Access Token then authorizes the Client to use the [resource server](../Extras/glossary.md#resource-server). Select the grant that agrees with the type of your Client.

## Choose a Grant

| Your situation | Grant to use |
| --- | --- |
| A machine gets a token for itself. There is no user. | [Client Credentials](./client_credentials.md) |
| A user gives your application access. The application is a server app, a browser app, or a native mobile app. | [Authorization Code with PKCE](./authorization_code.md) |
| The Access Token expired, and the Client has a Refresh Token. | [Refresh Token](./refresh_token.md) |
| The Client has a token from a different system, and exchanges it for a token from your server. | [Token Exchange](./token_exchange.md) |
| No standard grant agrees with your procedure. | [Custom Grant](./custom.md) |

The [Password](#password) and [Implicit](#implicit) grants are legacy grants. Do not use them in a new application.

## Recommended Grants

### [Authorization Code with PKCE](./authorization_code.md)

Use this grant when a user owns the Access Token. The Client redirects the user to the authorization server. The user gives access, and the server returns an authorization code. The Client then exchanges the code for the Access Token. PKCE protects the code against interception, and makes the flow safe for a [Public Client](../Extras/glossary.md#public-client). Use this grant for each type of user-facing Client: a server app, a browser app, and a native mobile app.

### [Client Credentials](./client_credentials.md)

Use this grant when a machine owns the Access Token, for example a server or an application that operates for itself. There is no user. The Client gets the token with its own credentials. Use it only with a [Confidential Client](../Extras/glossary.md#confidential-client).

### [Refresh Token](./refresh_token.md)

Use this grant to get a new Access Token when the old one expires. The Client sends its Refresh Token, and the user does nothing. This grant does not start a session. It extends a session that a different grant started.

## Extension Grants

### [Token Exchange](./token_exchange.md)

Use this grant when a Client exchanges one security token for a different one, for example a session token from a third-party service ([RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693)). You write the exchange procedure in your own `processTokenExchange` function.

### [Custom Grant](./custom.md)

Extend the `CustomGrant` class when no standard grant agrees with your procedure. This is an advanced option. Read the OAuth 2.0 specification before you write a custom grant.

## Legacy Grants

::: warning Do not use these grants in a new application
The OAuth 2.0 Security Best Current Practice ([RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)) tells you not to use them. Use [Authorization Code with PKCE](./authorization_code.md) instead.
:::

### [Password](./password.md)

The Client collects the name and the password of the user, and sends them to the `/token` endpoint. The Client sees the credentials of the user. RFC 9700 says this grant MUST NOT be used. The library keeps it only so an old first-party Client can migrate.

### [Implicit](./implicit.md)

The server returns the Access Token directly in the redirect, without an authorization code. The token shows in the URL, and it can leak. The library keeps this grant only for an old Client.

## Enable a Grant

The server enables the `client_credentials` and `refresh_token` grants by default. Enable the other grants with `enableGrantType`. The [Authorization Server](../authorization_server/index.md) page shows the procedure, and each grant page shows its own `enableGrantType` call.
