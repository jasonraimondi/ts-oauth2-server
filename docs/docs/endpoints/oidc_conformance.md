---
title: OIDC conformance smoke test
---

# OIDC conformance smoke test

A copy-pasteable [`openid-client`](https://github.com/panva/node-openid-client) recipe that exercises the full OIDC surface — discovery, JWKS, the authorization-code + PKCE flow, ID token validation, and UserInfo — against a running server. Use it as a release gate: a green run proves a real relying party can complete the flow end-to-end.

The library does not own routing, so this assumes you have wired the four OIDC endpoints (see the [example app](https://github.com/jasonraimondi/ts-oauth2-server/tree/main/example)):

| Route | Handler |
| --- | --- |
| `GET /authorize` | `authorizationServer.validateAuthorizationRequest` → `completeAuthorizationRequest` |
| `POST /token` | `authorizationServer.respondToAccessTokenRequest` |
| `GET /userinfo` | `authorizationServer.userInfo` |
| `GET /.well-known/openid-configuration` | `authorizationServer.openidConfiguration` |
| `GET /jwks` | `authorizationServer.jwks` |

## The recipe

Uses `openid-client@^5`. Point `ISSUER` at your running server.

```ts
import { generators, Issuer } from "openid-client";

const ISSUER = process.env.ISSUER ?? "https://issuer.example";
const CLIENT_ID = process.env.CLIENT_ID ?? "oidc-client";
const REDIRECT_URI = process.env.REDIRECT_URI ?? "https://rp.example/callback";

async function main() {
  // 1. Discovery — fetches /.well-known/openid-configuration and the JWKS.
  const issuer = await Issuer.discover(ISSUER);
  console.log("discovered:", issuer.metadata.issuer);

  const client = new issuer.Client({
    client_id: CLIENT_ID,
    redirect_uris: [REDIRECT_URI],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });

  // 2. Authorization request with PKCE + nonce.
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const nonce = generators.nonce();
  const authUrl = client.authorizationUrl({
    scope: "openid profile",
    code_challenge,
    code_challenge_method: "S256",
    nonce,
  });
  console.log("authorize:", authUrl);

  // 3. The user approves at authUrl; your server redirects back with ?code=...
  //    Paste that redirect URL (or wire it through a browser) to continue:
  const callbackUrl = process.env.CALLBACK_URL!; // e.g. https://rp.example/callback?code=...&state=...
  const params = client.callbackParams(callbackUrl);

  // 4. Token exchange + automatic id_token validation (signature via JWKS,
  //    iss, aud, exp, and nonce are all checked by openid-client).
  const tokenSet = await client.callback(REDIRECT_URI, params, { code_verifier, nonce });
  const idClaims = tokenSet.claims();
  console.log("id_token sub:", idClaims.sub);

  // 5. UserInfo with the access token.
  const userinfo = await client.userinfo(tokenSet.access_token!);
  console.log("userinfo sub:", userinfo.sub);

  // 6. Keystone assertion: the ID token subject equals the UserInfo subject.
  if (idClaims.sub !== userinfo.sub) throw new Error("FAIL: id_token.sub !== userinfo.sub");
  console.log("PASS: OIDC conformance smoke test succeeded");
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
```

## Expected output

```
discovered: https://issuer.example
authorize: https://issuer.example/authorize?client_id=oidc-client&scope=openid%20profile&...
id_token sub: 248289761001
userinfo sub: 248289761001
PASS: OIDC conformance smoke test succeeded
```

A non-zero exit with `FAIL` (or an `openid-client` validation error such as `id_token issued in the future`, `unexpected JWT alg received`, or `nonce mismatch`) signals a regression in the signing, discovery, or claims plumbing — treat it as a release blocker.

:::info Covered by the test suite
The same end-to-end path (authorize → token → JWKS → UserInfo, verified with an independent `jose` validator) is asserted in `test/e2e/oidc_keystone.spec.ts`, and the cross-cutting failure modes (algorithm confusion, `alg:none`, wrong `typ`/`iss`, expired/revoked tokens, missing `openid` scope, opaque-code nonce loss) in `test/e2e/oidc_resilience.spec.ts`.
:::
