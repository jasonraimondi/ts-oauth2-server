# TypeScript OAuth2.0 Server

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jasonraimondi/typescript-oauth2-server/build%20and%20test?label=tests&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![Maintainability](https://img.shields.io/codeclimate/coverage-letter/jasonraimondi/typescript-oauth2-server?label=maintainability&style=flat-square)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/maintainability)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server/releases/latest)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://www.npmjs.com/package/@jmondi/oauth2-server)

`@jmondi/oauth2-server` is a standards compliant implementation of an OAuth 2.0 authorization server for Node, written in TypeScript. 

Requires `node >= 12`

Out of the box it supports the following grants:

- [Authorization code grant](#authorization-code-grant-w-pkce)
- [Client credentials grant](#client-credentials-grant)
- [Refresh grant](#refresh-token-grant)
- [Implicit grant](#implicit-grant) // not recommended 
- [Resource owner password credentials grant](#password-grant) // not recommended

The following RFCs are implemented:

- [RFC6749 “OAuth 2.0”](https://tools.ietf.org/html/rfc6749)
- [RFC6750 “ The OAuth 2.0 Authorization Framework: Bearer Token Usage”](https://tools.ietf.org/html/rfc6750)
- [RFC7519 “JSON Web Token (JWT)”](https://tools.ietf.org/html/rfc7519)
- [RFC7636 “Proof Key for Code Exchange by OAuth Public Clients”](https://tools.ietf.org/html/rfc7636)

## Getting Started

Save some eye strain, **use the [documentation site](https://jasonraimondi.github.io/typescript-oauth2-server/)**

### Install

```bash
npm install --save @jmondi/oauth2-server
```

### Endpoints 


The server uses two endpoints, `GET /authorize` and `POST /token`. 

The [Token Endpoint](#the-token-endpoint) is a back channel endpoint that issues a useable access token. 

The [Authorize Endpoint](#the-authorize-endpoint) is a front channel endpoint that issues an authorization code. The authorization code can then be exchanged to the `AuthorizationServer` endpoint for a useable access token.

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
      res.redirect("/login")
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
      res.redirect("/scopes")
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

function handleError(e: any, res: Response) {
  if (e instanceof OAuthException) {
    res.status(e.status);
    res.send({
      status: e.status,
      message: e.message,
    });
    return;
  }
  throw e;
}
```

### The Authorization Server

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

By default, all access tokens have a 1 hour time to live. An optional second parameter in `enableGrantType` allows the Access Token TTL for each grant type to be set.

```typescript
authorizationServer.enableGrantType("client_credentials", new DateInterval("5h"));
authorizationServer.enableGrantType("authorization_code", new DateInterval("2h"));
```

The authorization server has a few optional settings with the following default values;

```typescript
AuthorizationServerOptions {
  requiresPKCE: true;
  useUrlEncode: true;
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
    useUrlEncode: false, // default is true
  }
);
```

### Repositories

There are a few repositories you are going to need to implement in order to create an `AuthorizationServer`.

[Auth Code Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#auth-code-repository)

[Client Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#client-repository)

[Scope Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#scope-repository) 

[Token Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#token-repository)

[User Repository](https://jasonraimondi.github.io/typescript-oauth2-server/repositories/#user-repository)

### Entities

And a few entities.

[Auth Code Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#auth-code-entity)

[Client Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#client-entity)

[Scope Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#scope-entity)

[Token Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#token-entity)

[User Entity](https://jasonraimondi.github.io/typescript-oauth2-server/entities/#user-entity)

## Grants

Grants are different ways a [client](https://jasonraimondi.github.io/typescript-oauth2-server/glossary/README.md#client) can obtain an `access_token` that will authorize it to use the [resource server](https://jasonraimondi.github.io/typescript-oauth2-server/glossary/README.md#resource-server).

### Which Grant?

Deciding which grant to use depends on the type of client the end user will be using.

```
+-------+
| Start |
+-------+
    V
    |
    
    |
+------------------------+              +-----------------------+
| Have a refresh token?  |>----Yes----->|  Refresh Token Grant  |
+------------------------+              +-----------------------+
    V
    |
    No
    |
+---------------------+                
|     Who is the      |                  +--------------------------+
| Access token owner? |>---A Machine---->| Client Credentials Grant |
+---------------------+                  +--------------------------+
    V
    |
    |
   A User
    |
    |
+----------------------+                
| What type of client? |   
+----------------------+     
    |
    |                                 +---------------------------+
    |>-----------Server App---------->| Auth Code Grant with PKCE |
    |                                 +---------------------------+
    |
    |                                 +---------------------------+
    |>-------Browser Based App------->| Auth Code Grant with PKCE |
    |                                 +---------------------------+
    |
    |                                 +---------------------------+
    |>-------Native Mobile App------->| Auth Code Grant with PKCE |
                                      +---------------------------+

```

### Client Credentials Grant

[Full Docs](https://jasonraimondi.github.io/typescript-oauth2-server/grants/client_credentials.html)

When applications request an access token to access their own resources, not on behalf of a user.

#### Flow

The client sends a **POST** to the `/token` endpoint with the following body:

- **grant_type** must be set to `client_credentials`
- **client_id** is the client identifier you received when you first created the application
- **client_secret** is the client secret
- **scope** is a string with a space delimited list of requested scopes. The requested scopes must be valid for the client.

The authorization server will respond with the following response.

- **token_type** will always be `Bearer`
- **expires_in** is the time the token will live in seconds
- **access_token** is a JWT signed token and can be used to authenticate into the resource server
- **scope** is a space delimited list of scopes the token has access to

### Authorization Code Grant (w/ PKCE)
   
A temporary code that the client will exchange for an access token. The user authorizes the application, they are redirected back to the application with a temporary code in the URL. The application exchanges that code for the access token. 

#### Flow

##### Part One

The client redirects the user to the `/authorize` with the following query parameters:

- **response_type** must be set to `code`
- **client_id** is the client identifier you received when you first created the application
- **redirect_uri** indicates the URL to return the user to after authorization is complete, such as org.example.app://redirect
- **state** is a random string generated by your application, which you’ll verify later
- **code_challenge** must match the The code challenge as generated below, 
- **code_challenge_method** – Either `plain` or `S256`, depending on whether the challenge is the plain verifier string or the SHA256 hash of the string. If this parameter is omitted, the server will assume plain.

The user will be asked to login to the authorization server and approve the client and requested scopes.

If the user approves the client, they will be redirected from the authorization server to the provided `redirect_uri` with the following fields in the query string:

- **code** is the authorization code that will soon be exchanged for a token
- **state** is the random string provided and should be compared against the initially provided state

##### Part Two

The client sends a **POST** to the `/token` endpoint with the following body:

- **grant_type** must be set to `authorization_code`
- **client_id** is the client identifier you received when you first created the application
- **client_secret** (optional) is the client secret and should only be provided if the client is confidential
- **redirect_uri**
- **code_verifier**
- **code** is the authorization code from the query string

The authorization server will respond with the following response

- **token_type** will always be `Bearer`
- **expires_in** is the time the token will live in seconds
- **access_token** is a JWT signed token and is used to authenticate into the resource server
- **refresh_token** is a JWT signed token and can be used in with the [refresh grant](#refresh-token-grant) 
- **scope** is a space delimited list of scopes the token has access to

#### Code Verifier

The `code_verifier` is part of the extended [“PKCE”](https://tools.ietf.org/html/rfc7636) and helps mitigate the threat of having authorization codes intercepted.

Before initializing [Part One](#part-one) of the authorization code flow, the client first creats a `code_verifier`. This is a cryptographically random string using the characters A-Z, a-z, 0-9, and the punctuation characters `-._~` (hyphen, period, underscore, and tilde), between 43 and 128 characters long.

We can do this in Node using the native crypto package and a `base64urlencode` function:

```typescript
import crypto from "crypto";

const code_verifier = crypto.randomBytes(43).toString("hex");
```

https://www.oauth.com/oauth2-servers/pkce/authorization-request/


#### Code Challenge

Now we need to create a `code_challenge` from our `code_verifier`. 

For devices that can perform a SHA256 hash, the code challenge is a BASE64-URL-encoded string of the SHA256 hash of the code verifier. 

```typescript
const code_challenge = base64urlencode(
  crypto.createHash("sha256")
    .update(code_verifier)
    .digest("hex")
);
```

Clients that do not have the ability to perform a SHA256 hash are permitted to use the plain `code_verifier` string as the `code_challenge`.

```typescript
const code_challenge = code_verifier;
```

### Refresh Token
Access tokens eventually expire. The refresh token grant enables the client to obtain a new access_token from an existing refresh_token.

#### Flow

A complete refresh token request will include the following parameters:

- **grant_type** must be set to `refresh_token`
- **client_id** is the client identifier you received when you first created the application
- **client_secret** if the client is confidential (has a secret), this must be provided
- **refresh_token** must be the signed token previously issued to the client
- **scope** (optional) the requested scope must not include any additional scopes that were not previously issued to the original token


The authorization server will respond with the following response

- **token_type** will always be `Bearer`
- **expires_in** is the time the token will live in seconds
- **access_token** is a JWT signed token and is used to authenticate into the resource server
- **refresh_token** is a JWT signed token and can be used in with the [refresh grant](#refresh-token-grant) 
- **scope** is a space delimited list of scopes the token has access to

### Password Grant

The Password Grant is for first party clients that are able to hold secrets (ie not Browser or Native Mobile Apps)

#### Flow

A complete refresh token request will include the following parameters:

- **grant_type** must be set to `password`
- **client_id** is the client identifier you received when you first created the application
- **client_secret** if the client is confidential (has a secret), this must be provided
- **username**
- **password**
- **scope** (optional) 

The authorization server will respond with the following response

- **token_type** will always be `Bearer`
- **expires_in** is the time the token will live in seconds
- **access_token** is a JWT signed token and is used to authenticate into the resource server
- **refresh_token** is a JWT signed token and can be used in with the [refresh grant](#refresh-token-grant) 
- **scope** is a space delimited list of scopes the token has access to


### Implicit Grant

This grant is supported in the AuthorizationServer, but not recommended to use and thus is not documented. Industry best practice recommends using the Authorization Code Grant w/ PKCE for clients such as native and browser-based apps.

Please look at these great resources:

- [OAuth 2.0 Implicit Grant](https://oauth.net/2/grant-types/implicit/)
- VIDEO: [What's Going On with the Implicit Flow?](https://www.youtube.com/watch?v=CHzERullHe8) by Aaron Parecki
- [Is the OAuth 2.0 Implicit Flow Dead?](https://developer.okta.com/blog/2019/05/01/is-the-oauth-implicit-flow-dead) by Aaron Parecki (developer.okta.com)

## Todo

Definitely: 

* feat: add optional refresh token version to expire refresh tokens 

Maybe: 

* feat?: token introspection
* feat?: allow users to only use individual grant, and not require all entities/repositories 

Maybe: 

* feat: change to https://oauth.net/2.1/

## Thanks

This project is inspired by the [PHP League's OAuth2 Server](https://oauth2.thephpleague.com/). Check out the [PHP
 League's other packages](https://thephpleague.com/#packages) for some other great PHP projects.
