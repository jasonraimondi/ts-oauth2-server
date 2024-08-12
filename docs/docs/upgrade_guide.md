# Upgrade Guide

## To v4

### Breaking Change

Only affects users implementing the `/revoke` and `/introspect` endpoints

- [`/introspect`](https://tsoauth2server.com/docs/endpoints/introspect) will now authenticate via client_credentials by default
- [`/revoke`](https://tsoauth2server.com/docs/endpoints/revoke) will now authenticate via client_credentials by default

Before (v3.x):

```ts
new AuthorizationServer(..., {
  authenticateIntrospect: false,
  authenticateRevoke: false,
})
```

Before (v4.x):


```ts
new AuthorizationServer(..., {
  authenticateIntrospect: true, // set to false to match 3.x
  authenticateRevoke: true,     // set to false to match 3.x
})
```

## To v3

### This package is now pure ESM

The package is now entirely ESM (ECMAScript Modules). More details about this change can be found in [Sindre Sorhus's writeup](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### `AuthorizationServer` Updates {#authorization-server}

In v2.x, `AuthorizationServer` constructor required all repositories. In v3.x, it has been simplified.

**Before (v2.x):**

```ts
const authorizationServer = new AuthorizationServer(
  authCodeRepository,
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  userRepository,
  jwtService,
  {
    requiresS256: false,
    tokenCID: "name",
  },
);
```

**After (v3.x):**

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    requiresS256: true,
    tokenCID: "id",
  },
);
```

### Enabling Grants

In v3, `enableGrantType` has been updated for the **"authorization_code"** and **"password"** grants.

#### Authorization Code Grant

`AuthorizationCodeGrant` now requires a [AuthorizationCodeRepository](./getting_started/repositories.mdx#auth-code-repository) and a [UserRepository](./getting_started/repositories.mdx#user-repository).

**Before (v2.x):**

```ts
authorizationServer.enableGrantType("authorization_code");
```

**After (v3.x):**

```ts
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authorizationCodeRepository,
});
```

#### Password Grant

`PasswordGrant` now requires a [UserRepository](./getting_started/repositories.mdx#user-repository).

**Before (v2.x):**

```ts
authorizationServer.enableGrantType("password");
```

**After (v3.x):**

```ts
authorizationServer.enableGrantType({
  grant: "password",
  userRepository,
});
```

### `AuthorizationServerOptions` Default Configuration Updates

The default options for `AuthorizationServer` have been modified to better align with the OAuth 2.0 specification:

| Option       | v2.x Value | v3.x Value |
| ------------ | ---------- | ---------- |
| requiresS256 | false      | true       |
| tokenCID     | "name"     | "id"       |

### Removed `setOptions` Method

The undocumented, public method `setOptions` has been removed in v3. Options can be set during `AuthorizationServer` initialization.

### `generateRandomToken` Function Fix

A bug in the `generateRandomToken` function has been fixed in v3.x.
