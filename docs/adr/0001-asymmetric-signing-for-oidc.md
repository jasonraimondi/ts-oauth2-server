# Asymmetric signing for OIDC tokens

To support OpenID Connect, ID tokens must be verifiable by relying parties against a public key published at a JWKS endpoint — which rules out the library's original symmetric HS256 signing. We decided that when OIDC is enabled, a single consumer-supplied asymmetric RSA keypair (RS256) signs **both** ID tokens and access tokens, every token header carries a `kid`, and the JWKS endpoint always publishes `{ keys: [...] }` as an array. The pre-existing symmetric `JwtService(secretString)` → HS256 path is retained unchanged so non-OIDC users see no breaking change. v1 ships RS256 only; ES256 is deferred (see Consequences).

## Considered Options

- **HS256 ID tokens** — rejected: a symmetric secret cannot be published, so relying parties could not verify ID tokens, defeating the purpose of OIDC.
- **Separate keys per token type (asymmetric ID tokens, HS256 access tokens)** — rejected: a published JWKS would then verify only ID tokens, surprising any resource server that fetches the JWKS to validate access tokens.
- **Adding the `jose` library** — rejected: `jsonwebtoken` (RS256 signing with `keyid`) plus Node's built-in `crypto` (public-key derivation and JWK export) cover every requirement without a new runtime dependency. The RFC 7638 thumbprint has no `crypto` primitive — it is a small hand-rolled function (canonical JSON of the required JWK members → SHA-256 → base64url).
- **Including ES256 in v1 alongside RS256** — rejected: OIDC Discovery §3 requires RS256 in `id_token_signing_alg_values_supported`. A single-key model with an ES256 key cannot satisfy that requirement, and advertising RS256 with no RS256 key behind it would be a lie. ES256 lands as a future *additive* change once a multi-key story exists; the single-key model is the constraint, not RS256 vs ES256.

## Consequences

- The library never generates keys at runtime; keypair generation, persistence, and rotation are the consumer's responsibility (a boot-generated key would break across restarts and load-balanced instances).
- v1 ships a single signing key. Multi-key rotation is a future *additive* change — `kid`-in-header and JWKS-as-array from day one mean it will never require a token-format break.
- The keypair signs **both** token types, so enabling OIDC on an existing deployment switches access tokens from HS256 to RS256. Access tokens issued before the switch can no longer be verified. The "byte-identical HS256 path" guarantee covers only consumers who never enable OIDC; enabling it is a one-time token-invalidating migration the consumer must plan for.
- ES256 is out of scope for v1 and will arrive together with multi-key support: with multiple keys in the JWKS, an ES256 deployment can publish both an ES256 signing key and a vestigial RS256 key to satisfy Discovery §3, or the spec position can be revisited. Either way the additive change is a capability bump, not a token-format break.
