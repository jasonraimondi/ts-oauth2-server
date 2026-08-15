# Upgrade guide

This page lists the breaking changes of each major version, with the most recent version first. Each section tells you what changed, and how to keep the previous behaviour. The [changelog](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/CHANGELOG.md) gives the full detail of every release.

## Upgrading to v5 {#to-v5}

This section is for a move from v4. There are some breaking changes. There is also an optional OpenID Connect layer, and it does not change the other flows.

### Breaking changes

**Node.js 22 is now the minimum.** `engines.node` is `">=22"`. Update your runtime and your CI, and then install the packages again.

**The implicit grant redirects with a fragment.** The server now adds each token to the redirect URI after `#`, and not after `?`, which obeys [RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2). To keep the query string:

```ts
new AuthorizationServer(..., { implicitRedirectMode: "query" });
```

**Revoke and introspect authenticate the Client.** Both endpoints now authenticate the Client with its `client_id`, and also its `client_secret` for a Confidential Client. Before, they used membership of the `client_credentials` grant. Thus a Public Client with PKCE can now revoke its own tokens, and a `client_credentials` Client does not change.

Two responses are also stricter. Introspection now rejects a Public Client. A failed client authentication at `/token/revoke` now returns `401 invalid_client`, and not the silent `200` from before. An invalid token, or a token of a different Client, still returns `200`.

To let a Public Client introspect:

```ts
new AuthorizationServer(..., { introspectionRequiresConfidentialClient: false });
```

**`JwtService.verify()` is stricter.** It pins the configured algorithm of the service, and it ignores the `algorithms` option that you pass. It also rejects a payload that is not an object. This changes your code only if you call the method yourself.

**Revoke and introspect verify the signature of the token.** Before, both endpoints decoded the JWT and did not check the signature. Thus introspection returned the claims that the caller supplied. Now the server finds the token, and returns its claims, only after the token verifies against the `JwtService`. A token that does not verify introspects as `{ "active": false }`, and revokes with a silent `200`.

Three consequences follow:

- **Key rotation:** A Client cannot introspect or revoke a token from a retired key. Revoke or expire these tokens on the server when you change the key.
- **A custom `JwtInterface`:** Your `verify(token, options)` must obey `ignoreExpiration`. If it does not, a request to revoke an expired token does nothing.
- **Response fields:** The `active`, `scope`, `client_id`, and `token_type` fields now always come from the stored state, and not from the claims of the token.

Some behaviour that was incorrect before is now correct, and you do nothing. The server finds a Refresh Token with no `token_type_hint`. It can introspect and revoke an opaque Refresh Token. It returns `{ "active": false }` for an unknown token, and not a `500`. It also reports `active: false` for each token that your repository marks as revoked, through `isRefreshTokenRevoked` or the optional `isAccessTokenRevoked`.

**The validation of `redirect_uri` is stricter.** The library now reads the parameter with the native WHATWG URL parser, which replaces the `uri-js` package. A value that the parser cannot read, such as `https://` with no host, now fails immediately with `400 invalid_request`. Before, it failed later with `401 invalid_client`. The server also rejects any `#` character, which includes a single `#` at the end ([RFC 6749 §3.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2)). There is no option to keep the old behaviour. Remove the fragment from your redirect URI.

**Redirect URIs use Exact Matching.** Before, the authorization endpoint ignored a difference in the port or in the query string. It now makes the two URIs agree exactly ([RFC 6749 §3.1.2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.3)). Only a Loopback Redirect URI can use a different port. This is an `http` URI with the host `localhost`, `127.0.0.1`, or `[::1]` ([RFC 8252 §7.3](https://datatracker.ietf.org/doc/html/rfc8252#section-7.3)).

The server also rejects a request with no `redirect_uri` when the Client has more than one Registered Redirect URI. There is no option to keep the old behaviour, because the old comparison could send an authorization code to a different origin on a shared host.

If the query string of a redirect URI never changes, register the full URI. For example, `https://app.example.com/callback?tenant=acme` matches itself exactly. If your Client added a query parameter to each request, put that data in the `state` parameter instead ([RFC 6749 §3.1.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.2)):

```ts
// Before: the redirect_uri varied per request —
// now rejected unless that exact variant is registered
const redirectUri = "https://app.example.com/callback?returnTo=/settings";

// After: the redirect_uri is byte-identical to the registered one;
// per-request data rides in `state` (which doubles as your CSRF token)
const state = crypto.randomUUID();
session.oauth = { state, returnTo: "/settings" };
const authorizeUrl =
  `https://auth.example.com/authorize?response_type=code&client_id=${clientId}` +
  `&redirect_uri=${encodeURIComponent("https://app.example.com/callback")}` +
  `&state=${state}`;

// In the callback handler: verify state, then recover the data
if (req.query.state !== session.oauth.state) throw new Error("state mismatch");
res.redirect(session.oauth.returnTo);
```

## Upgrading to v4 {#to-v4}

This section is for a move from v3. It applies to you only if you supply the revoke endpoint or the introspect endpoint.

### Breaking changes

**Introspect and revoke authenticate the Client.** The `authenticateIntrospect` and `authenticateRevoke` options now default to `true`. To keep the previous behaviour:

```ts
new AuthorizationServer(..., {
  authenticateIntrospect: false,
  authenticateRevoke: false,
});
```

**The constructor enables `client_credentials` and `refresh_token`.** There is no option to stop this. If you removed these grants on purpose, control the access of each Client in your `ClientRepository`.

**An unauthorized Client, and a scope error, now return `401`.** From version 4.0.3 these return `401`, and not `400`. An invalid token at the revoke endpoint or the introspect endpoint now returns `200` with `{ active: false }`, and does not throw. Correct each test that asserts a status code.

## Upgrading to v3 {#to-v3}

This section is for a move from v2. It is the largest change, because both the constructor and the grant setup are different.

### Breaking changes

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

**`respondToAccessTokenRequest` has no second argument.** Call it with the request only: `respondToAccessTokenRequest(request)`.

**The `setOptions()` method is removed.** Pass each option to the constructor. You cannot change an option after that.

**Node.js 16 is now the minimum.** `engines.node` is `">=16"`.

**`requestFromVanilla` is asynchronous.** From v3.6 it returns a `Promise`. Write `await requestFromVanilla(req)`.

**The package format changed.** Version 3.0.0 supplied ESM only, but version 3.0.1 supplies CommonJS again. Install `^3.0.1` or a later version, and `require()` continues to operate. Import each adapter from its own path, for example `@jmondi/oauth2-server/express`.
