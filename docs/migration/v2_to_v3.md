# Migrating from v2 to v3

_Estimated Upgrade Time: already ESM? 5 minutes; not ESM? it depends_

[[toc]]

## This package is now pure ESM

This package has been updated to a pure ESM (ECMAScript Modules) package. For more information on the implications of this change, refer to [Sindre Sorhus's writeup](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).


## AuthorizationServer {#authorization-server}

In the previous version (v2.x), the `AuthorizationServer` constructor required all repositories. In version 3.x, the 
constructor has been updated to simplify the defaults.

Before

```typescript
const authorizationServer = new AuthorizationServer(
  authCodeRepository,    // not included in v3.x
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  userRepository,        // not included in v3.x
  jwtService,
  {
    requiresS256: false, // Default value in v2.x
    tokenCID: "name",    // Default value in v2.x
  }
);
```

After

```typescript
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    requiresS256: true,  // Default value in v3.x
    tokenCID: "id",      // Default value in v3.x
  }
);
```

## Enabling Grants

In version 3, the enableGrantType has been changed for the **"authorization_code"** and **"password"** grants.

### Authorization Code Grant

To enable the AuthorizationCodeGrant, you now need to provide a [AuthorizationCodeRepository](../repositories/index.md#authorization-code-repository) and a [UserRepository](../repositories/index.md#user-repository).

**Before**

```typescript
authorizationServer.enableGrantType("authorization_code");
```

**After**

```typescript
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository, 
  authorizationCodeRepository,
});
```

### Password Grant

To enable the PasswordGrant, you now need to provide a [UserRepository](../repositories/index.md#user-repository).

**Before**

```typescript
authorizationServer.enableGrantType("password");
```

**After**

```typescript
authorizationServer.enableGrantType({
  grant: "password",
  userRepository, 
});
```

## AuthorizationServerOptions default configuration that has been updated

The default configuration options for `AuthorizationServer` have been modified to align more strictly with the OAuth 2.0 specification:

| Option       | Old Value | New Value |
|--------------| --------- | --------- |
| requiresS256 | false     | true      |
| tokenCID     | "name"    | "id"      |

## AuthorizationServer.setOptions has been dropped

If you happened to use this undocumented, public method, it has been dropped in v3. Options can be set on initialization of the AuthoriztionServer.

## Updated `generateRandomToken` function

In version 3.x, a bug with the `generateRandomToken` function has been fixed.