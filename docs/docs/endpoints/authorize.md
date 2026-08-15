---
title: /authorize
---

# The Authorize Endpoint

The `/authorize` endpoint starts the authorization procedure and issues an authorization code. The Client then sends this code to the `/token` endpoint and receives an Access Token.

This endpoint operates through the browser of the user. The Client redirects the user here, and your server redirects the user back to the Client. Thus each parameter is visible in the URL, the browser history keeps it, and the user can change it. Never send the client secret to this endpoint.

:::info
- You need this endpoint only for the authorization code grant.

- Accept the GET method for the initial request. Redirect the user agent to your authorization page.

- You can change the URL. `/oauth/authorize` and `/v1/authorize` are two other common names.
:::

The endpoint authenticates the end-user, gets their consent, and redirects to the Client with an authorization code. You write the login screen and the consent screen. Thus you can also add other checks, such as 2FA, MFA, or CAPTCHA, in the same handler.

## Implementation

```ts
import { requestFromExpress } from "@jmondi/oauth2-server/express";

app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  try {
    // Validate the HTTP request and return an AuthorizationRequest.
    const authRequest = await authorizationServer.validateAuthorizationRequest(
      requestFromExpress(req),
    );

    // You will probably redirect the user to a login endpoint.
    if (!req.user) {
      res.redirect("/login");
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
      res.redirect("/scopes");
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

## More Endpoints

The handler above redirects to two routes. You must write these two routes.

### Login Endpoint

```ts
app.get("/login", (req, res) => {
  // Render login form
});

app.post("/login", (req, res) => {
  // Authenticate user
  // If successful:
  req.session.user = authenticatedUser;
  res.redirect("/authorize"); // Redirect back to authorize endpoint
});
```

### Scopes Consent Endpoint

```ts
app.get("/scopes", (req, res) => {
  const authRequest = req.session.authRequest;
  // Render consent form with client info and requested scopes
});

app.post("/scopes", (req, res) => {
  const authRequest = req.session.authRequest;
  authRequest.isAuthorizationApproved = true; // or false if denied
  req.session.authRequest = authRequest;
  res.redirect("/authorize"); // Redirect back to authorize endpoint
});
```

## Request Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `response_type` | Yes | Set to `code` for the authorization code grant |
| `client_id` | Yes | The Client that requests the authorization |
| `redirect_uri` | Conditional | The destination of the redirect. It must [match a Registered Redirect URI exactly](../getting_started/entities.md#client-entity). You can omit it only when the Client has one Registered Redirect URI |
| `scope` | No | The scopes that the Client requests |
| `state` | Recommended | An opaque value. The server returns it on the redirect. Use it as your CSRF token |

```
GET /authorize?response_type=code&client_id=s6BhdRkqt3&state=xyz
    &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb HTTP/1.1
Host: server.example.com
```

:::warning Protect your login form and your consent form against CSRF
The library validates the OAuth parameters. But your login route and your consent route are usual web forms, and the library does not protect them. Add CSRF protection to both routes. Also, keep the life of the session that holds the `AuthorizationRequest` short.
:::

:::info Supports the following RFCs
[RFC6749 (OAuth 2.0)](https://datatracker.ietf.org/doc/html/rfc6749), [RFC7636 (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
:::
