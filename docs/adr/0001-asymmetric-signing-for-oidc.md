# Asymmetric signing for OIDC tokens

To support OpenID Connect, ID tokens must be verifiable by relying parties against a public key published at a JWKS endpoint — which rules out the library's original symmetric HS256 signing. We decided that when OIDC is enabled, a single consumer-supplied asymmetric keypair (RS256 or ES256) signs **both** ID tokens and access tokens, every token header carries a `kid`, and the JWKS endpoint always publishes `{ keys: [...] }` as an array. The pre-existing symmetric `JwtService(secretString)` → HS256 path is retained unchanged so non-OIDC users see no breaking change.

## Considered Options

- **HS256 ID tokens** — rejected: a symmetric secret cannot be published, so relying parties could not verify ID tokens, defeating the purpose of OIDC.
- **Separate keys per token type (asymmetric ID tokens, HS256 access tokens)** — rejected: a published JWKS would then verify only ID tokens, surprising any resource server that fetches the JWKS to validate access tokens.
- **Adding the `jose` library** — rejected: `jsonwebtoken` (RS256/ES256 signing with `keyid`) plus Node's built-in `crypto` (public-key derivation and JWK export) cover every requirement without a new runtime dependency. The RFC 7638 thumbprint has no `crypto` primitive — it is a small hand-rolled function (canonical JSON of the required JWK members → SHA-256 → base64url).

## Consequences

- The library never generates keys at runtime; keypair generation, persistence, and rotation are the consumer's responsibility (a boot-generated key would break across restarts and load-balanced instances).
- v1 ships a single signing key. Multi-key rotation is a future *additive* change — `kid`-in-header and JWKS-as-array from day one mean it will never require a token-format break.
- The keypair signs **both** token types, so enabling OIDC on an existing deployment switches access tokens from HS256 to RS256/ES256. Access tokens issued before the switch can no longer be verified. The "byte-identical HS256 path" guarantee covers only consumers who never enable OIDC; enabling it is a one-time token-invalidating migration the consumer must plan for.
