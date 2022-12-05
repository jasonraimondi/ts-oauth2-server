# Getting Started

## Install

[![npm](https://img.shields.io/npm/v/@jmondi/oauth2-server?style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

<code-group>
<code-block title="NPM" active>
```bash
npm install --save @jmondi/oauth2-server
```
</code-block>

<code-block title="PNPM">
```bash
pnpm add @jmondi/oauth2-server
```
</code-block>

<code-block title="YARN">
```bash
yarn add @jmondi/oauth2-server
```
</code-block>
</code-group>

## The Authorization Server

The AuthorizationServer depends on [the repositories](#repositories). By default, no grants are enabled; each grant is opt-in and must be enabled when creating the AuthorizationServer.

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
authorizationServer.enableGrantType("implicit"); // implicit grant is not recommended
authorizationServer.enableGrantType("password"); // password grant is not recommended
```

The authorization server has a few optional settings with the following default values;

```typescript
type AuthorizationServerOptions = {
  requiresPKCE: true;
  notBeforeLeeway: 0;
  tokenCID: "name"|"id"; // in v2.x default is "name", in 3.x default will be "id"
}
```

To configure these options, pass the value in as the last argument:

```typescript
const authorizationServer = new AuthorizationServer(
  authCodeRepository,
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  userRepository,
  new JwtService("secret-key"),
  {
    requiresPKCE: false, // default is true
    notBeforeLeeway: 10, // default is 0
  }
);
```

## The Token Endpoint

The `/token` endpoint is a back channel endpoint that issues a usable access token.

```typescript
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

## The Authorize Endpoint

The `/authorize` endpoint is a front channel endpoint that issues an authorization code. The authorization code can then be exchanged to the `AuthorizationServer` endpoint for a useable access token.

The endpoint should redirect the user to login, and then to accept the scopes requested by the application, and only when the user accepts, should it send the user back to the clients redirect uri. 

```typescript
import { requestFromExpress } from "@jmondi/oauth2-server/dist/adapters/express";

app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  try {
    // Validate the HTTP request and return an AuthorizationRequest.
    const authRequest = await authorizationServer.validateAuthorizationRequest(request, requestFromExpress(req));

    // You will probably redirect the user to a login endpoint. 
    if (!req.user) {
      req.redirect("/login")
      return;
    }
    // After login, the user should be redirected back with user in the session.
    // You will need to manage the authorization query on the round trip.
    // The auth request object can be serialized and saved into a user's session.

    // Once the user has logged in set the user on the AuthorizationRequest
    authRequest.user = req.user;
    
    // Once the user has approved or denied the client update the status
    // (true = approved, false = denied)
    authRequest.isAuthorizationApproved = getIsAuthorizationApprovedFromSession();

    // If the user has not approved the client's authorization request, 
    // the user should be redirected to the approval screen.
    if (!authRequest.isAuthorizationApproved) {
      // This form will ask the user to approve the client and the scopes requested.
      // "Do you authorize Jason to: read contacts? write contacts?"
      req.redirect("/scopes")
      return;
    }

    // At this point the user has approved the client for authorization.
    // Any last authorization requests such as Two Factor Authentication (2FA) can happen here.


    // Redirect back to redirect_uri with `code` and `state` as url query params.
    const oauthResponse = await authorizationServer.completeAuthorizationRequest(authRequest);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

## Revoke Tokens (RFC7009 “OAuth 2.0 Token Revocation”)

::: tip Note 
Implementing this endpoint is optional.
:::

The `/token/revoke` endpoint is a back channel endpoint that revokes an existing token.

```typescript
app.post("/token/revoke", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.revoke(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
```
