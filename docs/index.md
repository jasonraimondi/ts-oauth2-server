# Getting Started

<p class="badges">
  <a href="https://jsr.io/@jmondi/oauth2-server"><img src="https://jsr.io/badges/@jmondi/oauth2-server" alt="JSR"></a>
  <a href="https://github.com/jasonraimondi/ts-oauth2-server/releases/latest"><img src="https://img.shields.io/github/package-json/v/jasonraimondi/ts-oauth2-server?style=flat-square" alt="GitHub package.json version"></a>
  <a href="https://github.com/jasonraimondi/ts-oauth2-server"><img src="https://img.shields.io/github/actions/workflow/status/jasonraimondi/ts-oauth2-server/build-and-test.yml?branch=main&style=flat-square" alt="GitHub Workflow Status"></a>
  <a href="https://codecov.io/gh/jasonraimondi/ts-oauth2-server"><img src="https://codecov.io/gh/jasonraimondi/ts-oauth2-server/branch/main/graph/badge.svg?token=F7VTS15XOJ" alt="Test Coverage"></a>
  <a href="https://www.npmjs.com/package/@jmondi/oauth2-server"><img src="https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square" alt="NPM Downloads"></a>
</p>

## Introduction

A standards compliant implementation of an OAuth 2.0 authorization server for Nodejs that utilizes JWT and Proof Key for Code Exchange (PKCE), written in TypeScript.

## Quick Start

This section provides a high-level overview of setting up the OAuth2 server.

1. Install the package
1. Implement [Entities](/docs/getting_started/entities)
1. Set up your [Database Schema](/docs/getting_started/database_schema) (see SQL examples)
1. Implement [Repositories](/docs/getting_started/repositories)
1. Set up the [AuthorizationServer](#setup-the-authorization-server) with desired grant types
1. Implement the [Endpoints](/docs/endpoints/)

### Installation

Choose your preferred package manager to install @jmondi/oauth2-server:

::: code-group

```bash [pnpm]
pnpm add @jmondi/oauth2-server
```

```bash [npm]
npm install --save @jmondi/oauth2-server
```

```bash [yarn]
yarn add @jmondi/oauth2-server
```

```bash [jsr]
npx jsr add @jmondi/oauth2-server
```

```bash [deno]
deno add @jmondi/oauth2-server
```

```bash [bun]
bunx jsr add @jmondi/oauth2-server
```

:::

### Implement Entities

You are going to need to setup the entities that the OAuth2 server uses to store data. See the [full list of entities](/docs/getting_started/entities).

### Implement Repositories

Next you need to implement the repositories that the OAuth2 server uses to interact with the entities. See the [full list of repositories](/docs/getting_started/repositories).

### Setup the Authorization Server

The AuthorizationServer is the core component of the OAuth2 implementation. It requires repositories for managing clients, access tokens, and scopes. Grant types are opt-in and must be explicitly enabled.

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  "secret-key",
);
authorizationServer.enableGrantType("client_credentials");
// other grant types you want to enable
```

For a complete list of configuration options, refer to the [configuration documentation](/docs/authorization_server/configuration).

## Endpoints

### Token Endpoint

The `/token` endpoint is a back-channel endpoint that issues access tokens.

```ts
app.post("/token", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

### Authorize Endpoint

The `/authorize` endpoint is a front-channel endpoint that issues authorization codes, which can be exchanged for access tokens.

```ts
import { requestFromExpress } from "@jmondi/oauth2-server/express";

app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  try {
    // Step 1: Validate the authorization request
    const authRequest = await authorizationServer.validateAuthorizationRequest(
      request,
      requestFromExpress(req),
    );

    // Step 2: Ensure user is authenticated
    if (!req.user) {
      return res.redirect("/login"); // Redirect to login if user is not authenticated
    }

    // Step 3: Set the authenticated user on the AuthorizationRequest
    authRequest.user = req.user;

    // Step 4: Check if the user has approved the authorization
    authRequest.isAuthorizationApproved = getIsAuthorizationApprovedFromSession();

    // Step 5: If not approved, redirect to approval screen
    if (!authRequest.isAuthorizationApproved) {
      return res.redirect("/scopes"); // Redirect to scope approval screen
    }

    // Step 6: Complete the authorization request
    const oauthResponse = await authorizationServer.completeAuthorizationRequest(authRequest);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

### Revoke Token Endpoint

The `/token/revoke` endpoint revokes an existing token.

```ts
app.post("/token/revoke", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.revoke(req);
    return handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

## Security Best Practices

1. Use HTTPS for all OAuth2 endpoints
2. Implement rate limiting to prevent brute force attacks
3. Use strong, unique client secrets for each client
4. Implement proper token storage and transmission practices
5. Regularly rotate secrets and tokens
