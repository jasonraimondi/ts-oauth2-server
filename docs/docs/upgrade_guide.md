# Upgrade guide

Breaking changes for each major version, newest first. The [changelog](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/CHANGELOG.md) records every release in full.

## Upgrading to v5 {#to-v5}

From v4. Node.js 22 is now the minimum, and that reaches every project. Each of the other changes applies to one configuration, so find your rows here:

| This applies to you if | Go to |
| --- | --- |
| You enable the implicit grant | [Tokens move to the fragment](#v5-implicit) |
| You serve `/token/revoke` or `/token/introspect` | [Both endpoints changed](#v5-revoke-introspect) |
| Your `redirect_uri` changes per request, or holds a `#` | [Redirect URIs match exactly](#v5-redirect-uri) |
| You wrote a custom `JwtInterface`, or you call `JwtService.verify()` | [Verification is stricter](#v5-verify) |

If no row applies, install Node.js 22 and the upgrade is complete. OpenID Connect is new in v5, but it is optional and changes nothing until you set the `oidc` block.

### Node.js 22 {#v5-node}

`engines.node` is now `">=22"`. Update your runtime and your CI, then install the packages again.

### Tokens move to the fragment {#v5-implicit}

The implicit grant now adds each token to the redirect URI after `#`, and not after `?` ([RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2)). To keep the query string:

```ts
new AuthorizationServer(..., { implicitRedirectMode: "query" });
```

### Revoke and introspect changed {#v5-revoke-introspect}

**Both endpoints authenticate the Client by identity.** They read the `client_id`, and the `client_secret` for a Confidential Client. Before, they required membership of the `client_credentials` grant. Thus a Public Client with PKCE can now revoke its own tokens.

**Introspection rejects a Public Client.** To keep the previous behaviour:

```ts
new AuthorizationServer(..., { introspectionRequiresConfidentialClient: false });
```

**A failed client authentication at `/token/revoke` returns `401 invalid_client`.** Before, it returned a silent `200`. An invalid token still returns `200`.

**Both endpoints verify the signature of the token.** Before, they decoded the JWT without a check, so introspection returned whatever claims the caller sent. Now a token that does not verify introspects as `{ "active": false }`, and revokes with a silent `200`. Two consequences:

- You cannot revoke a token that a retired key signed. Revoke or expire those tokens on the server when you change a key.
- The `active`, `scope`, `client_id`, and `token_type` fields now come from your stored state, and not from the token.

[ADR 0008](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/docs/adr/0008-introspection-revocation-verified-persisted-state.md) records the reasoning.

::: details Four bugs are also fixed here — no action needed
The server now finds a Refresh Token with no `token_type_hint`. It introspects and revokes an opaque Refresh Token. It returns `{ "active": false }` for an unknown token in place of a `500`. It also reports `active: false` for a token that your repository marks as revoked, through `isRefreshTokenRevoked` or the optional `isAccessTokenRevoked`.
:::

### Redirect URIs match exactly {#v5-redirect-uri}

Two changes, and neither has an opt-out. The old comparison could send an authorization code to a different origin on a shared host.

**A `#` anywhere in a `redirect_uri` is rejected**, which includes a single `#` at the end ([RFC 6749 §3.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2)). A URI that the parser cannot read, such as `https://` with no host, now fails immediately with `400 invalid_request`, and not later with `401 invalid_client`. Remove the fragment.

**The port and the query string must now agree** ([RFC 6749 §3.1.2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.3)). Only a Loopback Redirect URI may vary its port: an `http` URI on `localhost`, `127.0.0.1`, or `[::1]` ([RFC 8252 §7.3](https://datatracker.ietf.org/doc/html/rfc8252#section-7.3)). The server also rejects a request that omits `redirect_uri` when the Client registered more than one.

A fixed query string needs no change. Register `https://app.example.com/callback?tenant=acme` and it matches itself exactly. If your Client built a different URI for each request, move that data into `state`:

```ts
// Before: the redirect_uri changed per request, and is now rejected
const redirectUri = "https://app.example.com/callback?returnTo=/settings";

// After: the redirect_uri is the registered one, and `state` carries the data
const state = crypto.randomUUID();
session.oauth = { state, returnTo: "/settings" };
const authorizeUrl =
  `https://auth.example.com/authorize?response_type=code&client_id=${clientId}` +
  `&redirect_uri=${encodeURIComponent("https://app.example.com/callback")}` +
  `&state=${state}`;

// In the callback handler, check `state` and then read the data back
if (req.query.state !== session.oauth.state) throw new Error("state mismatch");
res.redirect(session.oauth.returnTo);
```

[ADR 0007](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/docs/adr/0007-redirect-uri-exact-matching.md) records the reasoning.

### Verification is stricter {#v5-verify}

`JwtService.verify()` pins the configured algorithm of the service, and ignores the `algorithms` option that you pass. It also rejects a payload that is not an object.

If you supply a custom `JwtInterface`, your `verify(token, options)` must obey `ignoreExpiration`. Without it, a request to revoke an expired token does nothing.

### Authorization codes live 10 minutes {#v5-auth-code-ttl}

The default life of an authorization code is now 10 minutes, the maximum that [RFC 6749 §4.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2) recommends. Before, it was 15 minutes. To keep the previous value, or to set a different one, pass `authCodeTTL` when you enable the grant:

```ts
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authCodeRepository,
  authCodeTTL: new DateInterval("15m"),
});
```

## Upgrading to v4 {#to-v4}

From v3. This applies to you only if you serve the revoke endpoint or the introspect endpoint.

**Introspect and revoke authenticate the Client.** The `authenticateIntrospect` and `authenticateRevoke` options now default to `true`. To keep the previous behaviour:

```ts
new AuthorizationServer(..., {
  authenticateIntrospect: false,
  authenticateRevoke: false,
});
```

**The `client_credentials` and `refresh_token` grants are now enabled by default.** There is no method to disable them. If you removed these grants on purpose, control the access of each Client in your `ClientRepository`.

**An unauthorized Client, and a scope error, now return `401`.** From version 4.0.3 these return `401`, and not `400`. An invalid token at the revoke endpoint or the introspect endpoint now returns `200` with `{ active: false }`, and does not throw. Correct each test that asserts a status code.

## Upgrading to v3 {#to-v3}

From v2. This one needs code edits, because both the constructor and the grant setup change.

**The `AuthorizationServer` constructor is smaller.** The auth code repository and the user repository move out of the constructor, and you now pass them when you enable the grant. The other arguments change their sequence, and `clientRepository` comes first. The signing argument accepts a `JwtService` or a secret string.

```ts
// Before (v2)
new AuthorizationServer(authCodeRepository, clientRepository, tokenRepository, scopeRepository, userRepository, jwtService, { ... });
// After (v3)
new AuthorizationServer(clientRepository, tokenRepository, scopeRepository, new JwtService("secret-key"), { ... });
```

**The `authorization_code` and `password` grants take their repositories.** You cannot enable them by name. Pass an object that holds the repositories from the old constructor. You enable the other grants with their name.

```ts
// Before (v2)
server.enableGrantType("authorization_code");
server.enableGrantType("password");
// After (v3)
server.enableGrantType({ grant: "authorization_code", authCodeRepository, userRepository });
server.enableGrantType({ grant: "password", userRepository });
```

**Two defaults changed.** The `requiresS256` option is now `true`, and the server rejects the `plain` PKCE method. The `tokenCID` option is now `"id"`, which changes the Client identifier in each JWT. To keep the v2 behaviour:

```ts
new AuthorizationServer(..., { requiresS256: false, tokenCID: "name" });
```

::: details Five smaller v3 changes
**`respondToAccessTokenRequest` has no second argument.** Call it with the request only: `respondToAccessTokenRequest(request)`.

**The `setOptions()` method is removed.** Pass each option to the constructor. You cannot change an option after that.

**Node.js 16 is now the minimum.** `engines.node` is `">=16"`.

**`requestFromVanilla` is asynchronous.** From v3.6 it returns a `Promise`. Write `await requestFromVanilla(req)`.

**The package format changed.** Version 3.0.0 supplied ESM only, but version 3.0.1 supplies CommonJS again. Install `^3.0.1` or a later version, and `require()` continues to operate. Import each adapter from its own path, for example `@jmondi/oauth2-server/express`.
:::
