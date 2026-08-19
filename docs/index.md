# Getting Started

<p class="badges">
  <a href="https://jsr.io/@jmondi/oauth2-server"><img src="https://jsr.io/badges/@jmondi/oauth2-server" alt="JSR"></a>
  <a href="https://github.com/jasonraimondi/ts-oauth2-server/releases/latest"><img src="https://img.shields.io/github/package-json/v/jasonraimondi/ts-oauth2-server?style=flat-square" alt="GitHub package.json version"></a>
  <a href="https://github.com/jasonraimondi/ts-oauth2-server"><img src="https://img.shields.io/github/actions/workflow/status/jasonraimondi/ts-oauth2-server/build-and-test.yml?branch=main&style=flat-square" alt="GitHub Workflow Status"></a>
  <a href="https://codecov.io/gh/jasonraimondi/ts-oauth2-server"><img src="https://codecov.io/gh/jasonraimondi/ts-oauth2-server/branch/main/graph/badge.svg?token=F7VTS15XOJ" alt="Test Coverage"></a>
  <a href="https://www.npmjs.com/package/@jmondi/oauth2-server"><img src="https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square" alt="NPM Downloads"></a>
</p>

## Introduction

This library is a standards-compliant OAuth 2.0 authorization server for Node.js, written in TypeScript. It issues signed JWT Access Tokens, enforces PKCE by default, and adds an optional [OpenID Connect](/docs/oidc/getting_started) layer. It implements RFC 6749 and its companion RFCs for bearer tokens, revocation, introspection, and token exchange.

The library is framework-agnostic, and it does not own your storage or your routes. You write a small set of [repositories](/docs/getting_started/repositories) for your database, and you connect each endpoint to one server method. [Adapters](/docs/adapters/) for Express, Fastify, and H3 convert the request and response objects of your framework.

The library needs Node.js 22 or later.

## Quick Start

1. Install the package
1. Write your [entities](/docs/getting_started/entities)
1. Create your [database schema](/docs/getting_started/database_schema)
1. Write your [repositories](/docs/getting_started/repositories)
1. Create the [AuthorizationServer](#create-the-authorization-server) with the grants you need
1. Add the [endpoints](#add-the-endpoints)

### Installation

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

### Write the Entities and Repositories

The library does not store data. You write the [entities](/docs/getting_started/entities) that hold the data, and the [repositories](/docs/getting_started/repositories) that read and write it.

### Create the Authorization Server

The `AuthorizationServer` takes your client, token, and scope repositories, and a signing secret. The constructor enables the `client_credentials` and `refresh_token` grants. You must enable each of the other grants.

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  "secret-key",
);
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authCodeRepository,
});
```

[Configuration](/docs/authorization_server/configuration) lists the options. [Grants](/docs/grants/) helps you select a flow.

### Add the Endpoints

You control the routes. Each endpoint calls one method on the server.

| Route | Method | Required for |
| --- | --- | --- |
| [`/token`](/docs/endpoints/token) | `respondToAccessTokenRequest` | Every grant |
| [`/authorize`](/docs/endpoints/authorize) | `validateAuthorizationRequest` → `completeAuthorizationRequest` | Authorization code, implicit |
| [`/token/revoke`](/docs/endpoints/revoke) | `revoke` | Optional ([RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)) |
| [`/token/introspect`](/docs/endpoints/introspect) | `introspect` | Optional ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)) |
| [`/userinfo`](/docs/endpoints/userinfo) · [`/jwks`](/docs/oidc/getting_started) · [discovery](/docs/endpoints/discovery) | `userInfo`, `jwks`, `openidConfiguration` | [OIDC](/docs/oidc/getting_started) |

Use an [adapter](/docs/adapters/) to convert your framework's request and response objects.

## Security

Serve every endpoint over HTTPS. [Hash each client secret](/docs/getting_started/database_schema#hash-client-secrets) before you store it. The library enforces PKCE by default.

When your server issues tokens, read [Protecting Resources](/docs/getting_started/protecting_resources). It shows you how to validate the tokens in your API.
