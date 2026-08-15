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

Requires `node >= 22`.

## Quick Start

1. Install the package
1. Implement [Entities](/docs/getting_started/entities)
1. Set up your [Database Schema](/docs/getting_started/database_schema)
1. Implement [Repositories](/docs/getting_started/repositories)
1. Set up the [AuthorizationServer](#setup-the-authorization-server) with the grants you need
1. Wire up the [Endpoints](/docs/endpoints/)

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

### Implement Entities and Repositories

The library persists nothing itself. You implement the [entities](/docs/getting_started/entities) that hold the data and the [repositories](/docs/getting_started/repositories) that read and write them.

### Setup the Authorization Server

The `AuthorizationServer` takes your client, token, and scope repositories plus a signing secret. The constructor enables `client_credentials` and `refresh_token`; other grants are opt-in.

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

See [Configuration](/docs/authorization_server/configuration) for the options, and [Grants](/docs/grants/) for choosing between flows.

### Wire up the Endpoints

You own the routing; each endpoint is one method call on the server.

| Route | Method | Required for |
| --- | --- | --- |
| [`/token`](/docs/endpoints/token) | `respondToAccessTokenRequest` | Every grant |
| [`/authorize`](/docs/endpoints/authorize) | `validateAuthorizationRequest` → `completeAuthorizationRequest` | Authorization code, implicit |
| [`/token/revoke`](/docs/endpoints/revoke) | `revoke` | Optional ([RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)) |
| [`/token/introspect`](/docs/endpoints/introspect) | `introspect` | Optional ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)) |
| [`/userinfo`](/docs/endpoints/userinfo) · [`/jwks`](/docs/oidc/getting_started) · [discovery](/docs/endpoints/discovery) | `userInfo`, `jwks`, `openidConfiguration` | [OIDC](/docs/oidc/getting_started) |

Use an [adapter](/docs/adapters/) to translate your framework's request and response objects.

## Security

Serve every endpoint over HTTPS, and [hash client secrets](/docs/getting_started/database_schema#hash-client-secrets) before storing them. PKCE is enforced by default. Once you are issuing tokens, see [Protecting Resources](/docs/getting_started/protecting_resources) for validating them in your API.
