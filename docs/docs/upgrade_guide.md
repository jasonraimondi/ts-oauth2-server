# Upgrade Guide

## To v5

### Implicit Redirect Mode Defaults to Fragment

The implicit grant now appends access tokens to redirect URIs using URI fragments by default, as recommended by [RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2).

Before (v4.x):

```ts
new AuthorizationServer(..., {
  implicitRedirectMode: "query",
});
```

After (v5.x):

```ts
new AuthorizationServer(..., {
  implicitRedirectMode: "fragment", // set to "query" to match 4.x
});
```

### Revoke and Introspect authenticate client identity

The `/token/revoke` and `/token/introspect` endpoints now authenticate the **client's identity** (its `client_id`, plus `client_secret` for confidential clients) instead of asserting membership in the `client_credentials` grant ([RFC 7009 §2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1), [RFC 7662 §2.1](https://datatracker.ietf.org/doc/html/rfc7662#section-2.1)).

In v4 a client had to be authorized for the `client_credentials` grant to call these endpoints, which wrongly rejected legitimate clients — a public PKCE SPA or an auth-code-only confidential client could not revoke or introspect its own tokens. In v5 the grant-membership requirement is gone: revoke now accepts any registered client revoking its own tokens (revocation stays scoped to the client's own tokens). Introspection adds a separate confidential-client requirement — see below.

A failed client authentication on `/token/revoke` now returns `401 invalid_client`. In v4 — and through `v5.0.0-rc.2` — revoke silently returned `200` when client authentication failed (a missing or invalid `client_id`, a wrong `client_secret`, or a confidential client with no secret), which could mislead a caller into believing a still-live token had been revoked. Per [RFC 7009 §2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1) a failed client authentication is now refused with an [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2) `invalid_client` error, harmonizing revoke with introspect (which already threw). An invalid, unknown, or malformed *token* still returns `200` ([RFC 7009 §2.2](https://datatracker.ietf.org/doc/html/rfc7009#section-2.2)), as does an authenticated client revoking a token it does not own.

No action is required for `client_credentials` clients; their behavior is unchanged.

### Introspection requires a confidential client by default

`/token/introspect` now requires the introspecting client to be **confidential** (registered with a `client_secret`) by default, per [RFC 7662 §4](https://datatracker.ietf.org/doc/html/rfc7662#section-4) ("protected resources ... specifically authorized"). A public (secretless) client is rejected with `401 invalid_client`.

This is governed by the new `introspectionRequiresConfidentialClient` option, which defaults to `true`:

```ts
new AuthorizationServer(..., {
  introspectionRequiresConfidentialClient: true, // default; set to false to allow public clients to introspect
});
```

The option has no effect when `authenticateIntrospect` is `false`. Revoke is unaffected — public clients may still revoke their own tokens.

### OIDC support

The OIDC release is **additive** — non-OIDC flows are unchanged and you opt in by setting the `issuer` and `oidc` options. A few changes affect existing users regardless of OIDC; review them before upgrading. See the [CHANGELOG](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/CHANGELOG.md) for the full list.

#### `JwtService.verify()` hardening

Two verification behaviors changed. Both are safe-by-default tightenings — no legitimate consumer should break — but they are behavior changes worth noting.

**Algorithm pinning.** `verify()` pins verification to the service's configured algorithm and **ignores any caller-supplied `algorithms` in `VerifyOptions`**. This closes an algorithm-confusion vector. If you relied on passing `algorithms` to `verify()`, that option is now a no-op — configure the `JwtService` with the algorithm you intend instead. This applies to symmetric (HS256) consumers too.

**Non-object payloads are rejected.** `verify()` now rejects any token whose payload is not a JSON object, failing with `JWT payload must be an object`. The method has always declared a `Promise<Record<string, unknown>>` return type; previously a JWT signed with a string payload would resolve with the raw string, contradicting that contract. Only consumers using `JwtService` directly to verify their own string-payload tokens are affected — the library itself never signs non-object payloads.

#### OIDC access tokens carry `typ: "at+jwt"`

When OIDC is enabled, authorization-code access tokens carry the JOSE header `typ: "at+jwt"` ([RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)). This lets the `AccessTokenVerifier` reject an ID token presented as a bearer token. **Non-OIDC token wire format is unchanged.**

#### `BearerTokenResponse.body` gains an optional `id_token`

For OIDC `openid` flows, the token response body now includes an `id_token` string. The field is absent for non-OIDC flows and for OIDC flows that did not grant the `openid` scope. If you typed the response body strictly, widen it to allow the optional `id_token`.

#### `OAuthAuthCode` entity gains `nonce`, `authTime`, `maxAge`

The auth-code entity has three new optional OIDC fields:

```ts
interface OAuthAuthCode {
  // ...existing fields...
  nonce?: string | null;
  authTime?: number | null;
  maxAge?: number | null;
}
```

JWT authorization codes carry these inside the signed code and need no persistence changes.

#### Opaque authorization codes must persist `nonce`/`auth_time` for OIDC

::: warning Opaque-code consumers must persist nonce/auth_time
If you use **opaque** authorization codes (`useOpaqueAuthorizationCodes: true`) with OIDC, your `OAuthAuthCodeRepository` **must** persist and hydrate `nonce` (and `authTime` when `max_age` is requested). The library rebuilds the opaque code's payload from the stored row, so a dropped `nonce` is lost across the authorize → token round trip. A fail-loud guard rejects the exchange with `invalid_grant` rather than silently issuing a replay-vulnerable, nonce-less ID token. **JWT authorization codes avoid this obligation** and are the recommended choice for OIDC.
:::

See [Getting Started with OIDC](./oidc/getting_started.md) to enable the feature.

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

After (v4.x):

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

`AuthCodeGrant` now requires a [`authCodeRepository`](./getting_started/repositories.md#auth-code-repository) and a [`userRepository`](./getting_started/repositories.md#user-repository).

**Before (v2.x):**

```ts
authorizationServer.enableGrantType("authorization_code");
```

**After (v3.x):**

```ts
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authCodeRepository,
});
```

#### Password Grant

`PasswordGrant` now requires a [`userRepository`](./getting_started/repositories.md#user-repository).

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
