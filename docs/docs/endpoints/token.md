---
sidebar_position: 2
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

## Flow

The `/token` endpoint supports the following grant types:

### [Authorization Code Grant](/docs/grants/authorization_code) (RFC6749 Section 4.1)

- Used to exchange an authorization code for an access token
- Request parameters:
  - `grant_type=authorization_code`
  - `code`: The authorization code received from the authorization server
  - `redirect_uri`: Must match the original redirect URI used in the authorization request
  - `client_id`: The client identifier

### [Refresh Token Grant](/docs/grants/refresh_token) (RFC6749 Section 6)

- Used to obtain a new access token using a refresh token
- Request parameters:
  - `grant_type=refresh_token`
  - `refresh_token`: The refresh token issued to the client
  - `scope` (optional): The scope of the access request

### [Client Credentials Grant](/docs/grants/client_credentials) (RFC6749 Section 4.4)

- Used for machine-to-machine authentication where no user is involved
- Request parameters:
  - `grant_type=client_credentials`
  - `scope` (optional): The scope of the access request

### [Resource Owner Password Credentials Grant](/docs/grants/authorization_code) (RFC6749 Section 4.3)
- Used to exchange the resource owner's credentials for an access token
- Request parameters:
  - `grant_type=password`
  - `username`: The resource owner's username
  - `password`: The resource owner's password
  - `scope` (optional): The scope of the access request

### [Token Exchange](/docs/grants/token_exchange) (RFC8693)
- Used to exchange one security token for another
- Request parameters:
  - `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`
  - `subject_token`: The security token that is the subject of the exchange
  - `subject_token_type`: An identifier for the type of the `subject_token`
  - `requested_token_type` (optional): An identifier for the type of the requested security token
  - `audience` (optional): The logical name of the target service where the client intends to use the requested security token

:::note Supports the following RFC\'S
[RFC6749 (OAuth 2.0)](https://datatracker.ietf.org/doc/html/rfc6749), [RFC6750 (Bearer Token Usage)](https://datatracker.ietf.org/doc/html/rfc6750), [RFC8693 (Token Exchange)](https://datatracker.ietf.org/doc/html/rfc8693)
:::
