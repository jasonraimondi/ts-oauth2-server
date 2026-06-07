# Introspection requires a confidential client by default

RFC 7662 §4 SHOULDs that protected resources be "specifically authorized" to call the introspection endpoint, beyond the §2.1 MUST that they merely authenticate. After PR #233 reworked revoke/introspect to authenticate client *identity* (via `validateClientIdentity`) rather than `client_credentials` grant membership, any registered client — including public PKCE SPAs — could introspect, which meets the §4 MUST but not the SHOULD. v5.0.0-rc.1 is the window to set the stricter v5 default. We decided to gate introspection on the client being a **Confidential Client** (`isClientConfidential` ⇔ `!!client.secret`), controlled by a new `introspectionRequiresConfidentialClient` option defaulting to `true`. The gate lives in `ClientCredentialsGrant.respondToIntrospectRequest` — consuming the `OAuthClient` that `validateClientIdentity` already returns — and applies only when `authenticateIntrospect` is enabled; a rejected Public Client gets `invalid_client` (401). Consumers who need the permissive behavior opt in by setting the flag to `false`.

## Considered Options

- **Per-client capability (an explicit `canIntrospect`-style flag on the client entity)** — rejected for v5: it is the literal reading of "specifically authorized," but it extends the `OAuthClient` entity and the consumer's repository contract, a far larger breaking surface. "Confidential" is a sufficient answer to a SHOULD; a per-client capability remains a possible v5.x follow-up.
- **Default the flag to `false` (zero behaviour change from rc.1)** — rejected: it leaves §4 unmet by default, and the RC window is precisely when the stricter default should be set. rc.1's widened access is unreleased, so tightening it now breaks no stable consumer.
- **Return `active: false` instead of 401** — rejected: §2.3 permits it for declining a *particular token*, but a client categorically barred from the endpoint is an authorization failure; §2.3 itself directs a 401 there, and `invalid_client` keeps one uniform failure mode with the existing confidential-without-secret path.

## Consequences

- **Revoke is deliberately NOT gated this way.** RFC 7009 lets a Public Client revoke its own tokens, and PR #233 specifically fixed that. The asymmetry — introspect requires confidential, revoke does not — is intentional; a future PR that "aligns" them reopens either the §4 gap or the #233 bug.
- **"Confidential" is a coarse proxy for "specifically authorized":** every Confidential Client may introspect any token, not just designated resource servers. This is the accepted limitation of the v5 answer.
- **`authenticateIntrospect: false` still disables all client checks**, including this one — the two flags layer rather than fight. The strict flag has teeth only when authentication is on.
