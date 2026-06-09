---
title: Getting Started with OIDC
---

# Getting Started with OIDC

OpenID Connect (OIDC) is an identity layer on top of the authorization-code flow. When enabled, the server issues a signed **ID token** alongside the access token, exposes a **UserInfo** endpoint, publishes its public keys at a **JWKS** endpoint, and advertises its capabilities through **discovery**.

OIDC is opt-in. The non-OIDC token flows are unchanged when the `oidc` block is absent.

## Prerequisites

1. **An RSA signing key.** OIDC mandates RS256, so the `JwtService` must be constructed with an asymmetric key, not a shared secret. See [Keypair Lifecycle](./keypair_lifecycle.md).
2. **An `issuer`.** The top-level `issuer` option is reused as the OIDC issuer and becomes mandatory under OIDC — it is the `iss` of every access token and ID token, and the `issuer` in the discovery document.

## Configuration

OIDC is configured with the top-level `issuer` plus a nested `oidc` block on `AuthorizationServerOptions`:

```ts
import { AuthorizationServer, JwtService } from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService({ key: process.env.RSA_PRIVATE_KEY_PEM }), // RS256
  {
    issuer: "https://auth.example.com",
    oidc: {
      authorizationEndpoint: "https://auth.example.com/authorize",
      tokenEndpoint: "https://auth.example.com/token",
      userinfoEndpoint: "https://auth.example.com/userinfo",
      jwksUri: "https://auth.example.com/jwks",
      getUserClaims: async subject => {
        const user = await db.users.findById(subject);
        return { sub: subject, name: user.name, email: user.email, email_verified: true };
      },
    },
  },
);

authorizationServer.enableGrantType({
  grant: "authorization_code",
  authCodeRepository,
  userRepository,
});
```

The library does not own routing, so the endpoint URLs are supplied explicitly — they appear verbatim in the discovery document. See the full [options table](../authorization_server/configuration.md#oidc-options).

## Wire the endpoints

The three new OIDC endpoints each return a plain `ResponseInterface`, so every adapter handles them unchanged:

```ts
// JWKS — the relying party fetches the public verification keys here.
app.get("/jwks", (req, res) => handleExpressResponse(res, authorizationServer.jwks()));

// Discovery — .well-known/openid-configuration
app.get("/.well-known/openid-configuration", (req, res) =>
  handleExpressResponse(res, authorizationServer.openidConfiguration()),
);

// UserInfo — returns scope-derived claims for a presented access token.
app.get("/userinfo", async (req, res) => {
  try {
    handleExpressResponse(res, await authorizationServer.userInfo(req));
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

The `/authorize` and `/token` endpoints are unchanged — when the `openid` scope is granted, `/token` adds an `id_token` to the response body automatically.

## Call the flow

Request the `openid` scope (plus any of `profile`, `email`, `address`, `phone`) at `/authorize`. The standard OIDC scopes are auto-recognized for the authorization code flow when OIDC is enabled (other grants are unaffected). After exchanging the code at `/token`, the response carries both an `access_token` and an `id_token`; the access token also drives [UserInfo](../endpoints/userinfo.md).

To confirm the whole surface works against a real relying party, run the [OIDC conformance smoke test](../endpoints/oidc_conformance.md).

::: warning Opaque codes must persist `nonce` / `auth_time`
If you enable opaque authorization codes (`useOpaqueAuthorizationCodes: true`), your `OAuthAuthCodeRepository` must persist and hydrate `nonce` (and `authTime` when `max_age` is requested), or the code exchange fails loud with `invalid_grant`. The library rebuilds the opaque code's payload from the stored row, so a dropped field is lost across the authorize → token round trip. JWT authorization codes carry these fields inside the signed code and are recommended for OIDC.
:::

## Access token format

The access token is a JWT tagged `typ: at+jwt` ([RFC 9068](https://www.rfc-editor.org/rfc/rfc9068)), but two claims intentionally deviate from the strict profile for backward compatibility:

- **`cid`, not `client_id`.** The library has always identified the client with the non-standard `cid` claim; RFC 9068 §2.2 specifies `client_id`. Resource servers reading the access token should look for `cid`.
- **`aud` is conditional.** RFC 9068 §2.2 lists `aud` as required, but the access token carries `aud` only when an `audience` (or `aud`) parameter is supplied on the request. With no audience requested, no `aud` claim is emitted.

The ID token is unaffected and follows OpenID Connect Core 1.0.

## Known limitations (v1)

- **No ID token on refresh.** ID tokens are issued only in the authorization-code exchange.
- **No `offline_access` auto-recognition.** Refresh-token issuance remains consumer-owned.
- **RS256 only.** ES256 is deferred — a single-key model cannot satisfy OIDC Discovery §3 with an ES256 key. See [Keypair Lifecycle](./keypair_lifecycle.md#multi-key-rotation).
- **Plain JSON UserInfo only.** Signed/encrypted UserInfo responses are not yet supported.

## Next steps

- [Keypair Lifecycle](./keypair_lifecycle.md) — generating, storing, and rotating the RSA key.
- [Hooks reference](./hooks.md) — `getUserClaims` vs `getIdTokenClaims`.
- [UserInfo](../endpoints/userinfo.md) · [Discovery](../endpoints/discovery.md) — per-endpoint detail.
