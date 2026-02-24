---
sidebar_position: 1
title: /authorize
---

# The Authorize Endpoint

The `/authorize` endpoint is a front channel endpoint that initiates the authorization process and issues an authorization code. This code can then be exchanged at the `/token` endpoint for a usable access token.

:::info
- This endpoint is only necessary if you are implementing the Authorization Code Grant.

- The authorization endpoint should only support the GET method for the initial request. The user agent should be redirected to the authorization page.

- The URL `/authorize` can be customized, some other common urls are: `/oauth/authorize`, `/v1/authorize`, etc.
:::

## Purpose

The primary purposes of the `/authorize` endpoint are:

1. To authenticate the resource owner (end-user)
2. To obtain authorization from the resource owner for the client application
3. To issue an authorization code if the authentication and authorization are successful

## Flow

1. The client application redirects the user to the `/authorize` endpoint
2. The authorization server authenticates the user (if not already authenticated)
3. The server presents the user with a consent screen to approve or deny the client's request
4. If approved, the server redirects the user back to the client's redirect URI with an authorization code
5. Additional checks like 2FA, MFA, or CAPTCHA can be implemented as needed

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
      req.redirect("/login");
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
      req.redirect("/scopes");
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

## Key Components

1. **User Authentication**: If the user is not authenticated, redirect to a login page.
2. **Consent Screen**: If the user hasn't approved the authorization, redirect to a consent page.
3. **Authorization Completion**: If authenticated and approved, complete the authorization process.

## Additional Endpoints

To support the full flow, you'll need to implement additional endpoints:

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

The `/authorize` endpoint typically accepts the following parameters:

- `response_type`: Must be set to "code" for the authorization code grant
- `client_id`: The identifier of the client requesting authorization
- `redirect_uri`: The URI to redirect the user after authorization
- `scope`: (Optional) The scope of the access request
- `state`: (Recommended) An opaque value used to maintain state between the request and callback

## Example Request

```
GET /authorize?response_type=code&client_id=s6BhdRkqt3&state=xyz
    &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb HTTP/1.1
Host: server.example.com
```

## Security Considerations

1. Always use HTTPS for the authorization endpoint
2. Validate all input parameters
3. Implement CSRF protection for the login and consent forms
4. Use short-lived sessions and secure session management
5. Implement rate limiting to prevent brute-force attacks

:::note Supports the following RFC\'S
[RFC6749 (OAuth 2.0)](https://datatracker.ietf.org/doc/html/rfc6749), [RFC7636 (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
:::
