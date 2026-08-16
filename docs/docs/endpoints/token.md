---
title: /token
---

# The Token Endpoint

The `/token` endpoint issues an Access Token, and it supports the grant types from the OAuth 2.0 specifications.

The Client calls this endpoint directly, from its server to your server. The browser is not part of the request, and thus the Client can safely send its client secret.

:::info
- Send each request to `/token` with the HTTP POST method. Include the client credentials in the `Authorization` header, or in the request body.

- You can change the URL. `/oauth/token` and `/v1/token` are two other common names.
:::

```ts
app.post("/token", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```

## Supported Grants

The `grant_type` parameter selects the flow. Each grant page gives the parameters and an example request and response.

| `grant_type` | Use it to | Specification |
| --- | --- | --- |
| [`authorization_code`](/docs/grants/authorization_code) | Exchange an authorization code for an Access Token | [RFC 6749 §4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1) |
| [`refresh_token`](/docs/grants/refresh_token) | Exchange a Refresh Token for a new Access Token | [RFC 6749 §6](https://datatracker.ietf.org/doc/html/rfc6749#section-6) |
| [`client_credentials`](/docs/grants/client_credentials) | Authenticate a machine when there is no user | [RFC 6749 §4.4](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4) |
| [`password`](/docs/grants/password) | Exchange the credentials of a user | [RFC 6749 §4.3](https://datatracker.ietf.org/doc/html/rfc6749#section-4.3) |
| [`urn:ietf:params:oauth:grant-type:token-exchange`](/docs/grants/token_exchange) | Exchange one security token for a different one | [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693) |

When you enable OIDC and the server grants the `openid` scope, the authorization code response also contains an [ID Token](/docs/grants/authorization_code#openid-connect-id-tokens).

:::info Supports the following RFCs
[RFC6749 (OAuth 2.0)](https://datatracker.ietf.org/doc/html/rfc6749), [RFC6750 (Bearer Token Usage)](https://datatracker.ietf.org/doc/html/rfc6750), [RFC8693 (Token Exchange)](https://datatracker.ietf.org/doc/html/rfc8693)
:::
