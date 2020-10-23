# TypeScript OAuth2.0 Server

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jasonraimondi/typescript-oauth2-server/build%20and%20test?label=tests&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![Maintainability](https://img.shields.io/codeclimate/coverage-letter/jasonraimondi/typescript-oauth2-server?label=maintainability&style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/maintainability)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server/releases/latest)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server for Node, written in TypeScript. 

Requires `node >= 12`

Out of the box it supports the following grants:

- [Authorization code grant](#authorization-code-grant-with-pkce)
- [Implicit grant](#implicit-grant) 
- [Client credentials grant](#client-credentials-grant)
- [Resource owner password credentials grant](#password-grant)
- [Refresh grant](#refresh-token-grant)

The following RFCs are implemented:

- [RFC6749 “OAuth 2.0”](https://tools.ietf.org/html/rfc6749)
- [RFC6750 “ The OAuth 2.0 Authorization Framework: Bearer Token Usage”](https://tools.ietf.org/html/rfc6750)
- [RFC7519 “JSON Web Token (JWT)”](https://tools.ietf.org/html/rfc7519)
- [RFC7636 “Proof Key for Code Exchange by OAuth Public Clients”](https://tools.ietf.org/html/rfc7636)

### [See Documentation](https://jasonraimondi.github.io/typescript-oauth2-server/)

### Install

```bash
npm install --save @jmondi/oauth2-server
```

## Endpoints 

There are two endpoints you are going to need to implement in our server. The [Token Endpoint](#the-token-endpoint
) is a back channel endpoint that issues a useable access token. The [Authorize Endpoint](#the-authorize-endpoint) is a front channel endpoint that issues an authorization code. The authorization code can then be exchanged to the `AuthorizationServer` endpoint for a useable access token.

#### The Token Endpoint

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

#### The Authorize Endpoint

The `/authorize` endpoint is a front channel endpoint that issues an authorization code. The authorization code can then be exchanged to the `AuthorizationServer` endpoint for a useable access token.

The endpoint should redirect the user to login, and then to accept the scopes requested by the application, and only when the user accepts, should it send the user back to the clients redirect uri.

We are able to add in scope acceptance and 2FA into our authentication flow.

```typescript
app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  const request = new OAuthRequest(req);

  try {
    // Validate the HTTP request and return an AuthorizationRequest.
    const authRequest = await authorizationServer.validateAuthorizationRequest(request);

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
    return handleResponse(req, res, oauthResponse);
  } catch (e) {
    handleError(e, res);
  }
});
```

## Repositories

There are a few repositories you are going to need to implement in order to create an `AuthorizationServer`.

[Auth Code Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#auth-code-repository)

[Client Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#client-repository)

[Scope Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#scope-repository) 

[Token Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#token-repository)

[User Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#user-repository)

## Entities

And a few entities.

[Auth Code Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#auth-code-entity)

[Client Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#client-entity)

[Scope Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#scope-entity)

[Token Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#token-entity)

[User Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#user-entity)

**@TODO**

* feat: add refresh token version to expire refresh tokens 
* feat: allow users to only use individual grant, and not require all entities/repositories 
* feat: token introspection
* chore: documentation

Maybe: 

* feat: change to https://oauth.net/2.1/

## Thanks

This project is inspired by the [PHP League's OAuth2 Server](https://oauth2.thephpleague.com/). Check out the [PHP
 League's other packages](https://thephpleague.com/#packages) for some other great PHP projects.
