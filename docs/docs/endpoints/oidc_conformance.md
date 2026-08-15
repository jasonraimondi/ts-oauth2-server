---
title: OIDC conformance smoke test
---

# OIDC conformance smoke test

This [`openid-client`](https://github.com/panva/node-openid-client) script tests the full OIDC surface against a running server. It tests discovery, JWKS, the authorization code flow with PKCE, the validation of the ID Token, and UserInfo. Run it before each release. A correct run shows you that a real Client can complete the full flow.

The library does not control your routes. Thus this script assumes that you added the OIDC endpoints. The [example application](https://github.com/jasonraimondi/ts-oauth2-server/tree/main/example) shows you how.

| Route | Handler |
| --- | --- |
| `GET /authorize` | `authorizationServer.validateAuthorizationRequest` → `completeAuthorizationRequest` |
| `POST /token` | `authorizationServer.respondToAccessTokenRequest` |
| `GET /userinfo` | `authorizationServer.userInfo` |
| `GET /.well-known/openid-configuration` | `authorizationServer.openidConfiguration` |
| `GET /jwks` | `authorizationServer.jwks` |

## The Script

This script uses `openid-client@^5`. Set `ISSUER` to the address of your running server.

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

The script can also stop with a `FAIL` message, or with an `openid-client` error such as `id_token issued in the future`, `unexpected JWT alg received`, or `nonce mismatch`. Each of these shows a fault in the signing, in the discovery, or in the claims. Do not release the server until you correct the fault.

:::note Two differences from RFC 9068
The validators above check the ID Token strictly. But the **Access Token** is different from RFC 9068 in two places. It identifies the Client with `cid`, and not with `client_id`. It also carries `aud` only when the token request supplies an `audience` parameter. See [Access Token Format](../oidc/getting_started.md#access-token-format).
:::

:::info The test suite covers this path
`test/e2e/oidc_keystone.spec.ts` tests the same path, from `/authorize` to `/token` to the JWKS to UserInfo, with an independent `jose` validator. `test/e2e/oidc_resilience.spec.ts` tests the failures: algorithm confusion, `alg:none`, an incorrect `typ` or `iss`, an expired or revoked token, an absent `openid` scope, and the loss of a nonce from an opaque code.
:::
