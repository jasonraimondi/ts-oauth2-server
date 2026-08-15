---
title: /token
---

# The Token Endpoint

The `/token` endpoint is a back channel endpoint that issues a usable access token. It supports multiple grant types as defined in OAuth 2.0 specifications.

:::info
- All requests to the `/token` endpoint should use the HTTP POST method and include appropriate authentication (e.g., client credentials in the Authorization header or in the request body).

- The url `/token` can be anything, some other common urls are: `/oauth/token`, `/v1/token`, etc.
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

## Supported grants

The `grant_type` parameter selects the flow. Each grant page documents its own parameters and sample request/response.

| `grant_type` | Use it to | Spec |
| --- | --- | --- |
| [`authorization_code`](/docs/grants/authorization_code) | Exchange an authorization code for a token | [RFC 6749 §4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1) |
| [`refresh_token`](/docs/grants/refresh_token) | Trade a refresh token for a fresh access token | [RFC 6749 §6](https://datatracker.ietf.org/doc/html/rfc6749#section-6) |
| [`client_credentials`](/docs/grants/client_credentials) | Authenticate a machine with no user involved | [RFC 6749 §4.4](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4) |
| [`password`](/docs/grants/password) | Exchange a user's credentials directly | [RFC 6749 §4.3](https://datatracker.ietf.org/doc/html/rfc6749#section-4.3) |
| [`urn:ietf:params:oauth:grant-type:token-exchange`](/docs/grants/token_exchange) | Exchange one security token for another | [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693) |

When OIDC is enabled and the `openid` scope is granted, the authorization code response also carries an [`id_token`](/docs/grants/authorization_code#openid-connect-id-tokens).

:::info Supports the following RFCs
[RFC6749 (OAuth 2.0)](https://datatracker.ietf.org/doc/html/rfc6749), [RFC6750 (Bearer Token Usage)](https://datatracker.ietf.org/doc/html/rfc6750), [RFC8693 (Token Exchange)](https://datatracker.ietf.org/doc/html/rfc8693)
:::
