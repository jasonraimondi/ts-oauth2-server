# OIDC layered onto the authorization code grant

The OpenID Connect layer is implemented as an extension of the existing `authorization_code` grant, not as a separate provider. ID-token issuance lives inside `AuthCodeGrant`; the three non-grant endpoints (UserInfo, discovery, JWKS) are added as methods on `AuthorizationServer` alongside the existing `revoke` and `introspect`. There is deliberately no separate `OidcProvider` class.

The decisive constraint: the ID token is returned in the `/token` response body, which is built inside `AuthCodeGrant` — so ID-token logic must touch the grant regardless. A separate class would not isolate OIDC; it would only split it across two places.

## Considered Options

- **Separate `OidcProvider` companion class** — rejected: the grant is entangled either way (it builds the token response), so a separate class provides no real isolation, only a split implementation.
- **`OidcProvider` subclassing/replacing `AuthorizationServer`** — rejected: heavy inheritance for what is fundamentally additive surface.

## Scope boundary for v1 (the deliberate exclusions)

- **`response_type=code` only** — no implicit (`id_token`, `token`) or hybrid (`code id_token`) flows. This eliminates fragment-encoded ID tokens and `c_hash`, and matches the modern PKCE-first recommendation.
- **No FAPI** — the `claims` request parameter, JAR (`request`/`request_uri`), `response_mode` beyond `query`, and pairwise subject identifiers are out of scope.
- **No ID token on the refresh flow** — `RefreshTokenGrant` stays OIDC-unaware; reissuing an ID token on refresh raises stale-`nonce`/`auth_time` correctness traps and would spread OIDC logic into a second grant.
- **No formal conformance suite in CI** — verification relies on unit tests plus one keystone e2e that checks an issued ID token against the live JWKS.

Each exclusion is additive to lift later if demand appears; none requires a token-format or API break to revisit.
