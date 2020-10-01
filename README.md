# @jmondi/oauth2-server

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jasonraimondi/typescript-oauth2-server/Tests?label=tests&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)
[![Test Coverage](https://api.codeclimate.com/v1/badges/f70a85595f0a488874e6/test_coverage)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/f70a85595f0a488874e6/maintainability)](https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/maintainability)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/jasonraimondi/typescript-oauth2-server?style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server/releases/latest)
[![NPM Downloads](https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square)](https://github.com/jasonraimondi/typescript-oauth2-server)

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


## Installing

```bash
npm install @jmondi/oauth2-server
```

## Implementation

See the [In Memory example that uses Express](./examples/in_memory)

The server uses two endpoints, `GET /authorize` and `POST /token`. 

```typescript
const authorizationServer = new AuthorizationServer();
authorizationServer.enableGrantType(new ClientCredentialsGrant(...);
authorizationServer.enableGrantType(new AuthCodeGrant(...);
authorizationServer.enableGrantType(new RefreshTokenGrant(...);
```

### Using in Express

```typescript
const app = Express();

app.use(json());
app.use(urlencoded({ extended: false }));
```

### The `/token` endpoint

The `/token` endpoint is a back channel endpoint that issues an a useable access token.

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

### The `/authorize` endpoint

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
    const user = { identifier: "abc", email: "user@example.com" };
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

## Which Grant?

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

For machine to machine communications

When applications request an access token to access their own resources, not on behalf of a user.


```http request
POST /token HTTP/1.1
Host: example.com
 
grant_type=client_credentials
&client_id=xxxxxxxxxx
&client_secret=xxxxxxxxxx 
```

[Token Response][access_token_response]:

```http request
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache
 
{
  "access_token":"f",
  "token_type":"bearer",
  "expires_in":3600,
  "refresh_token":"IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk",
  "scope":"create"
}
```

### Authorization Code Grant with PKCE

A temporary code that the client will exchange for an access token. The user authorizes the application, they are redirected back to the application with a temporary code in the URL. The application exchanges that code for the access token. 

If the client is unable to keep a secret, the client secret should be undefined and **should not** be used during the authorization_code flow.

- **response_type=code** – indicates that your server expects to receive an authorization code
- **client_id=** – The client ID you received when you first created the application
- **redirect_uri=** – Indicates the URL to return the user to after authorization is complete, such as org.example.app://redirect
- **state=1234zyx** – A random string generated by your application, which you’ll verify later
- **code_challenge=XXXXXXXXX** – The code challenge generated as previously described
- **code_challenge_method=S256** – Either plain or S256, depending on whether the challenge is the plain verifier string or the SHA256 hash of the string. If this parameter is omitted, the server will assume plain.

```typescript
const code_verifier = base64urlencode(crypto.randomBytes(40));
const code_challenge = base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));
```

A complete authorization request will include the following parameters

```http request
GET /authorize HTTP/1.1
Host: example.com
 
id=123
&response_type=code
&client_id=xxxxxxx
&redirect_uri=http://localhost
&scope=xxxx
&state=xxxx
&code_challenge=xxxx
&code_challenge_method=s256
```

A complete access token request will include the following parameters:

```http request
POST /token HTTP/1.1
Host: example.com
 
grant_type=authorization_code
&code=xxxxxxxxx
&redirect_uri=xxxxxxxxxx
&client_id=xxxxxxxxxx
&code_verifier=xxxxxxxxxx
```

### Refresh Token Grant

Access tokens eventually expire. The refresh_token enables the client to refresh the access token.

A complete refresh token request will include the following parameters:

```http request
POST /token HTTP/1.1
Host: example.com
Authorization: Basic Y4NmE4MzFhZGFkNzU2YWRhN
 
grant_type=refresh_token
&refresh_token=xxxxxxxxx
&client_id=xxxxxxxxx
&client_secret=only-required-if-client-has-secret
&scope=xxxxxxxxxx
```

### Implicit Grant

// @todo document

Industry best practice recommends using the Authorization Code Grant without a client secret for native and browser-based apps.

### Password Grant

// @todo document

### Token Introspection Endpoint

Request

```http request
POST /token_info HTTP/1.1
Host: example.com
Authorization: Basic Y4NmE4MzFhZGFkNzU2YWRhN
 
token=MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3
```

Response

```http request
HTTP/1.1 200 OK
Host: example.com
Content-Type: application/json; charset=utf-8
 
{
  "active": true,
  "scope": "read write email",
  "client_id": "J8NFmU4tJVgDxKaJFmXTWvaHO",
  "username": "aaronpk",
  "exp": 1437275311
}
```

## @TODO

:construction_worker: This project is under development :construction:

* feat: flag for require code_challenge for public clients
* feat: token introspection
* chore: documentation

## Sources

This project was heavily influenced by the [PHP League OAuth2 Server](https://oauth2.thephpleague.com/) and shares a lot of the same ideas.

https://github.com/thephpleague/oauth2-server

https://tools.ietf.org/html/rfc6749#section-4.4

https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/

https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/

https://tools.ietf.org/html/rfc6749#section-4.1 

https://tools.ietf.org/html/rfc7636

https://www.oauth.com/oauth2-servers/pkce/

https://www.oauth.com/oauth2-servers/pkce/authorization-request/

[access_token_response]: https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/ "Access Token Response"

[client_credentials]: https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/ "Client Credentials Grant"
