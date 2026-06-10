# Upgrade guide

Breaking changes for each major version, newest first. Every section lists what changed and how to keep the old behavior. The [changelog](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/CHANGELOG.md) has the full detail for every release.

## Upgrading to v5 {#to-v5}

Coming from v4. A few breaking changes, plus opt-in OpenID Connect that leaves non-OIDC flows unchanged.

### Breaking changes

**Node.js 22 is now the minimum.** `engines.node` is `">=22"`. Update your runtime and CI, then reinstall.

**The implicit grant redirects with a fragment.** Tokens are appended to the redirect URI after `#` instead of `?`, following [RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2). Keep the old query-string behavior:

```ts
new AuthorizationServer(..., { implicitRedirectMode: "query" });
```

**Revoke and introspect authenticate the client.** Both endpoints now authenticate the client by its `client_id` (plus `client_secret` for confidential clients) rather than by membership in the `client_credentials` grant. As a result, a public PKCE client can revoke its own tokens, while `client_credentials` clients are unaffected. Two responses tighten alongside this: introspection now rejects public clients, and a failed client authentication on revoke returns `401 invalid_client` rather than the silent `200` it returned before. An invalid or unowned token still returns `200`, as it always has. To let public clients introspect, opt out:

```ts
new AuthorizationServer(..., { introspectionRequiresConfidentialClient: false });
```

**`JwtService.verify()` is stricter.** It pins to the service's configured algorithm, ignoring any `algorithms` you pass, and rejects non-object payloads. Only relevant if you call it directly.

**Revoke and introspect verify the token's signature.** Previously both endpoints decoded the presented JWT without checking its signature, so introspection echoed whatever claims the caller supplied. Now a token is only looked up — and its claims only echoed — after it verifies against the server's `JwtService`; an unverifiable token introspects as `{ "active": false }` and revokes as a silent `200`. Three things follow:

- **Key rotation:** tokens signed by a retired key can no longer be introspected or revoked by presenting the JWT — revoke or expire them server-side when rotating.
- **Custom `JwtInterface`:** your `verify(token, options)` must honor `ignoreExpiration`, or revoking already-expired tokens silently no-ops.
- **Response fields:** `active`, `scope`, `client_id`, and `token_type` now always reflect stored state rather than the token's claims.

Alongside this, behavior that was previously broken is now correct, with no action needed: refresh tokens are found without a `token_type_hint`, opaque refresh tokens can be introspected and revoked, introspecting an unknown token returns `{ "active": false }` instead of a `500`, and introspection reports `active: false` for tokens your repository flags via `isRefreshTokenRevoked` / the optional `isAccessTokenRevoked`.

**`redirect_uri` validation is stricter.** The parameter is now parsed with the native WHATWG URL parser (replacing the unmaintained `uri-js`). Unparseable values (e.g. `https://` with no host) fail up front with `400 invalid_request` instead of `401 invalid_client` at client matching, and any `#` — including a bare trailing `#`, which previously slipped through — is rejected per [RFC 6749 §3.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2). There is no opt-out; remove the fragment from your redirect URI.

## Upgrading to v4 {#to-v4}

Coming from v3. Only relevant if you expose the revoke or introspect endpoints.

### Breaking changes

**Introspect and revoke require client authentication.** `authenticateIntrospect` and `authenticateRevoke` now default to `true`. Keep the old behavior:

```ts
new AuthorizationServer(..., {
  authenticateIntrospect: false,
  authenticateRevoke: false,
});
```

**`client_credentials` and `refresh_token` are enabled automatically.** The constructor turns both on, with no opt-out. If you deliberately excluded them, restrict access per client in your `ClientRepository`.

**Unauthorized client and scope errors return `401`.** Since 4.0.3 these return `401` instead of `400`, and an invalid token on revoke or introspect returns `200` / `{ active: false }` rather than throwing. Update any status-code assertions.

## Upgrading to v3 {#to-v3}

Coming from v2. The biggest jump: both the constructor and grant setup change.

### Breaking changes

**The `AuthorizationServer` constructor is smaller.** The auth-code and user repositories move out of it into grant enablement, and the remaining arguments reorder so `clientRepository` comes first. The signing argument accepts a `JwtService` or a secret string.

```ts
// Before (v2)
new AuthorizationServer(authCodeRepository, clientRepository, tokenRepository, scopeRepository, userRepository, jwtService, { ... });
// After (v3)
new AuthorizationServer(clientRepository, tokenRepository, scopeRepository, new JwtService("secret-key"), { ... });
```

**The `authorization_code` and `password` grants take their repositories.** They can no longer be enabled by name. Pass an object carrying the repositories the constructor used to hold. Other grants still enable by string.

```ts
// Before (v2)
server.enableGrantType("authorization_code");
server.enableGrantType("password");
// After (v3)
server.enableGrantType({ grant: "authorization_code", authCodeRepository, userRepository });
server.enableGrantType({ grant: "password", userRepository });
```

**Two defaults changed.** `requiresS256` is now `true` (rejecting `plain` PKCE) and `tokenCID` is now `"id"` (changing the client identifier in issued JWTs). Pass the old values to keep v2 behavior:

```ts
new AuthorizationServer(..., { requiresS256: false, tokenCID: "name" });
```

**`respondToAccessTokenRequest` drops its second argument.** Call it with the request only: `respondToAccessTokenRequest(request)`.

**`setOptions()` was removed.** Pass options to the constructor. They're immutable after construction.

**Node.js 16 is now the minimum.** `engines.node` is `">=16"`.

**`requestFromVanilla` is async.** Since v3.6 it returns a `Promise`. Use `await requestFromVanilla(req)`.

**Packaging changed.** v3.0.0 shipped ESM-only, but v3.0.1 restored CommonJS. Install `^3.0.1` or later and `require()` keeps working. Adapters now import from subpaths like `@jmondi/oauth2-server/express`.
