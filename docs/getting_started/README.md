# Getting Started

## Install

[![npm](https://img.shields.io/npm/v/@jmondi/oauth2-server?style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

Install with `npm` or `yarn`:

<code-group>
<code-block title="NPM" active>
```bash
npm install --save @jmondi/oauth2-server
```
</code-block>

<code-block title="YARN">
```bash
yarn add @jmondi/oauth2-server
```
</code-block>
</code-group>

### Getting Started

## The Token Endpoint

The `/token` endpoint is a back channel endpoint that issues a useable access token.

```typescript
app.post("/token", async (req: Express.Request, res: Express.Response) => {
  const response = new OAuthResponse(res);
  try {
    const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req, response);
    return handleResponse(req, res, oauthResponse);
  } catch (e) {
    handleError(e, res);
    return;
  }
});
```

## The Authorize Endpoint

The `/authorize` endpoint is a front channel endpoint that issues an authorization code. The authorization code can then be exchanged to the `AuthorizationServer` endpoint for a useable access token.

The endpoint should redirect the user to login, and then to accept the scopes requested by the application, and only when the user accepts, should it send the user back to the clients redirect uri. 

```typescript
app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  const request = new OAuthRequest(req);

  try {
    // Validate the HTTP request and return an AuthorizationRequest object.
    const authRequest = await authorizationServer.validateAuthorizationRequest(request);

    // The auth request object can be serialized and saved into a user's session.
    // You will probably want to redirect the user at this point to a login endpoint.

    // Once the user has logged in set the user on the AuthorizationRequest
    console.log("Once the user has logged in set the user on the AuthorizationRequest");
    const user = { id: "abc", email: "user@example.com" };
    authRequest.user = user;

    // At this point you should redirect the user to an authorization page.
    // This form will ask the user to approve the client and the scopes requested.

    // Once the user has approved or denied the client update the status
    // (true = approved, false = denied)
    authRequest.isAuthorizationApproved = true;

    // Return the HTTP redirect response
    const oauthResponse = await authorizationServer.completeAuthorizationRequest(authRequest);
    return handleResponse(req, res, oauthResponse);
  } catch (e) {
    handleError(e, res);
  }
});
```

## The Authorization Server

The AuthorizationServer is the meat and potatoes. The server depends on [the repositories listed here](../repositories/README.md). 

You can enable any grant types you would like to support.

```typescript
const authorizationServer = new AuthorizationServer(
  authCodeRepository,
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  userRepository,
  new JwtService("secret-key"),
);
authorizationServer.enableGrantType("client_credentials");
authorizationServer.enableGrantType("authorization_code");
authorizationServer.enableGrantType("refresh_token");

// implicit grant is not recommended for new apps
authorizationServer.enableGrantType("implicit");
// password grant is not recommended for new apps
authorizationServer.enableGrantType("password");
```

An optional second parameter in `enableGrantType` allows the Access Token TTL to be set.

```typescript
authorizationServer.enableGrantType("client_credentials", new DateInterval("2h"));
```

The server uses two endpoints, `GET /authorize` and `POST /token`. 
