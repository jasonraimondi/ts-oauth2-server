---
title: Getting Started with OIDC
---

# Getting Started with OIDC

OpenID Connect (OIDC) is an identity layer on the authorization code flow. When you enable OIDC, the server does four more things. It issues a signed **ID Token** with the Access Token, it supplies a **UserInfo** endpoint, it publishes its public keys at a **JWKS** endpoint, and it declares its capabilities in the **Discovery Document**.

OIDC is optional. If you do not set the `oidc` block, the other token flows do not change.

## Before You Start

You need two things:

1. **An RSA signing key.** OIDC makes RS256 mandatory. Thus you must give your `JwtService` an asymmetric key, and not a shared secret. See [Keypair Lifecycle](./keypair_lifecycle.md).
2. **An `issuer`.** The OIDC layer uses the top-level `issuer` option as the Issuer, and the option becomes mandatory. It is the `iss` claim of each Access Token and each ID Token, and also the `issuer` field of the Discovery Document.

## Configuration

Set the top-level `issuer` and the nested `oidc` block on `AuthorizationServerOptions`:

```ts
import { AuthorizationServer, JwtService } from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService({ key: process.env.RSA_PRIVATE_KEY_PEM! }), // RS256
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

The library does not control your routes. Thus you give each endpoint URL here, and the Discovery Document shows these values. The [options table](../authorization_server/configuration.md#oidc-options) gives the full list.

## Add the Endpoints

Each of the three OIDC endpoints returns a `ResponseInterface`. Thus every adapter handles them in the usual way.

```ts
// JWKS — each Client reads the public verification keys here.
app.get("/jwks", (req, res) => handleExpressResponse(res, authorizationServer.jwks()));

// Discovery — .well-known/openid-configuration
app.get("/.well-known/openid-configuration", (req, res) =>
  handleExpressResponse(res, authorizationServer.openidConfiguration()),
);

// UserInfo — returns the Scope-Derived Claims for an Access Token.
app.get("/userinfo", async (req, res) => {
  try {
    handleExpressResponse(res, await authorizationServer.userInfo(req));
  } catch (e) {
    handleExpressError(e, res);
  }
});
```

The `/authorize` and `/token` endpoints do not change. When the server grants the `openid` scope, `/token` adds an ID Token to the response body.

## Call the Flow

Request the `openid` scope at `/authorize`. You can also request `profile`, `email`, `address`, and `phone`. When you enable OIDC, the authorization code flow accepts these scopes automatically. The other grants do not change.

Next, exchange the code at `/token`. The response contains an Access Token and an ID Token. The Access Token also gives access to [UserInfo](../endpoints/userinfo.md).

To make sure that a real Client can complete the flow, run the [OIDC conformance smoke test](../endpoints/oidc_conformance.md).

::: warning An opaque code must store `nonce` and `auth_time`
If you set `useOpaqueAuthorizationCodes: true`, your `OAuthAuthCodeRepository` must store and return the `nonce`. It must also store and return `authTime` when a Client requests `max_age`. If it does not, the code exchange fails with `invalid_grant`.

The library rebuilds the payload of an opaque code from the stored row. Thus the row is the only record, and a lost field breaks the flow between `/authorize` and `/token`. A JWT authorization code holds these fields in the signed code, and we recommend it for OIDC.
:::

## Access Token Format

Each Access Token is a JWT with the JOSE header `typ: at+jwt` ([RFC 9068](https://www.rfc-editor.org/rfc/rfc9068)). Two claims are different from the strict profile, which keeps the token compatible with the older versions:

- **`cid`, not `client_id`.** This library has always identified the Client with the `cid` claim, but RFC 9068 §2.2 specifies `client_id`. Your resource server must read `cid`.
- **`aud` is conditional.** RFC 9068 §2.2 makes `aud` mandatory. But the Access Token carries `aud` only when the request supplies an `audience` or `aud` parameter. If the request has no audience, the token has no `aud` claim.

The ID Token is different. It obeys OpenID Connect Core 1.0.

## Known Limitations (v1)

- **No ID Token on a refresh.** The server issues an ID Token only in the authorization code exchange.
- **No automatic `offline_access` scope.** You control the issue of each Refresh Token.
- **RS256 only.** ES256 comes later, because the server holds one RSA key, and that key can advertise RS256 only in the `id_token_signing_alg_values_supported` field that OIDC Discovery §3 requires. See [Keypair Lifecycle](./keypair_lifecycle.md#multi-key-rotation).
- **Plain JSON UserInfo only.** The server cannot sign or encrypt a UserInfo response.

## Next Steps

- [Keypair Lifecycle](./keypair_lifecycle.md) — how to make, store, and change the RSA key.
- [Hooks reference](./hooks.md) — `getUserClaims` and `getIdTokenClaims`.
- [UserInfo](../endpoints/userinfo.md) and [Discovery](../endpoints/discovery.md) — the detail for each endpoint.
