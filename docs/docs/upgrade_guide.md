---
sidebar_position: 5
---

# Upgrade Guide

## Migrating from v2 to v3

[[toc]]

### This package is now pure ESM

The package is now entirely ESM (ECMAScript Modules). More details about this change can be found in [Sindre Sorhus's writeup](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### `AuthorizationServer` Updates {#authorization-server}

In v2.x, `AuthorizationServer` constructor required all repositories. In v3.x, it has been simplified.

**Before (v2.x):**

```typescript
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

```typescript
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

`AuthorizationCodeGrant` now requires a [AuthorizationCodeRepository](../../repositories/index.md#authorization-code-repository) and a [UserRepository](../../repositories/index.md#user-repository).

**Before (v2.x):**

```typescript
authorizationServer.enableGrantType("authorization_code");
```

**After (v3.x):**

```typescript
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authorizationCodeRepository,
});
```

#### Password Grant

`PasswordGrant` now requires a [UserRepository](../../repositories/index.md#user-repository).

**Before (v2.x):**

```typescript
authorizationServer.enableGrantType("password");
```

**After (v3.x):**

```typescript
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
