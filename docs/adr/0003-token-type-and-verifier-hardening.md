# Token-type discrimination and verifier hardening

Under OIDC the same asymmetric keypair signs both access tokens and ID tokens with the same issuer (see ADR 0001), so an ID token presented to the UserInfo endpoint would otherwise pass signature and expiry verification and be accepted as an access token. We decided that, when OIDC is enabled, access tokens are signed with the JOSE header `typ: "at+jwt"` (RFC 9068) while ID tokens keep `typ: "JWT"`, and the UserInfo endpoint — and any other access-token verifier — rejects a token whose `typ` is not `at+jwt`. Independently, `JwtService.verify` pins its algorithm: it always passes `algorithms: [configuredAlgorithm]` so a token's own `alg` header can never drive verification.

## Considered Options

- **Rely on the `openid`-scope check to reject ID tokens at UserInfo** — rejected: an ID token carries no `scope` claim so it 403s today, but that is accidental, undocumented, and defeated the moment a `getIdTokenClaims` hook adds a scope-shaped claim.
- **A structural marker claim (e.g. require `cid`)** — rejected: not a recognized spec guard and equally defeatable by a custom-claims hook.
- **Leave `verify()` forwarding caller options unchanged** — rejected: `jsonwebtoken@9` blocks HS-vs-public confusion only by key-type inference; pinning the algorithm deliberately, in one place, removes the chance for any call site to forget.

## Consequences

- The `at+jwt` header is applied only when OIDC is enabled, so the byte-identical HS256 token format for non-OIDC consumers (ADR 0001) is unaffected. It does add to the one-time token-format change OIDC already entails.
- `JwtService.verify` now pins `["HS256"]` for existing symmetric consumers as well. This is a safe-by-default tightening of verification behaviour, not a token-format change, but it is a behaviour change worth noting for any consumer relying on the previous pass-through.
- Algorithm pinning lives in the library's own `JwtService`. A consumer who supplies a custom `JwtInterface` implementation remains responsible for pinning algorithms in their own verifier.
