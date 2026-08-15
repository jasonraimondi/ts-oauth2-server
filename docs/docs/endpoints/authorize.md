---
title: /authorize
---

# The Authorize Endpoint

The `/authorize` endpoint is a front channel endpoint that initiates the authorization process and issues an authorization code. This code can then be exchanged at the `/token` endpoint for a usable access token.

:::info
- This endpoint is only necessary if you are implementing the Authorization Code Grant.

- The authorization endpoint should only support the GET method for the initial request. The user agent should be redirected to the authorization page.

- The URL `/authorize` can be customized, some other common urls are: `/oauth/authorize`, `/v1/authorize`, etc.
:::

The endpoint authenticates the end-user, collects their consent, and redirects back to the client with an authorization code. You own the login and consent screens, so any extra checks — 2FA, MFA, CAPTCHA — go in the same handler.

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

## Additional Endpoints

The handler above redirects to two routes you implement yourself.

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
| `response_type` | Yes | `code` for the authorization code grant |
| `client_id` | Yes | The client requesting authorization |
| `redirect_uri` | Conditional | Where to send the user afterwards. Must [match a registered URI exactly](../getting_started/entities.md#client-entity); may be omitted only when the client has exactly one registered URI |
| `scope` | No | The requested scope |
| `state` | Recommended | Opaque value echoed back on the redirect; also your CSRF token |

```
GET /authorize?response_type=code&client_id=s6BhdRkqt3&state=xyz
    &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb HTTP/1.1
Host: server.example.com
```

:::warning Your login and consent forms need CSRF protection
The library validates the OAuth parameters, but the routes you add around it are ordinary web forms. Protect them, and keep the session holding the `AuthorizationRequest` short-lived.
:::

:::info Supports the following RFCs
[RFC6749 (OAuth 2.0)](https://datatracker.ietf.org/doc/html/rfc6749), [RFC7636 (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
:::
