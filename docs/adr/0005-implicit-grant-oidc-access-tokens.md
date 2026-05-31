# Implicit grant issues fully-formed OIDC access tokens

When OIDC is enabled, every access token the library mints is tagged `typ: at+jwt` (ADR 0003), including the one the implicit grant issues at the authorization endpoint. The implicit grant previously assembled its token fields directly via `JwtService.extraTokenFields`, bypassing the shared `extraJwtFields()` seam and omitting `iss` — producing an `at+jwt` token the AccessTokenVerifier rejects on issuer mismatch. We routed implicit issuance back through the shared seam so its access token carries `iss`, accepting that the library mints **valid** OIDC access tokens for implicit even though implicit is deprecated by OAuth 2.1 and is not advertised in the Discovery Document (`response_types_supported: ["code"]`).

## Considered Options

- **Carve implicit out of the `at+jwt` branch** (leave its token `typ: JWT`) — rejected: produces a stranger artifact (an OIDC-key-signed JWT that UserInfo rejects) and adds a grant-specific special case to `encryptAccessToken`, for no real gain.
- **Document implicit+OIDC as unsupported and leave the malformed token** — rejected: a token tagged `at+jwt` but missing `iss` is simply a bug; "unsupported" is not a licence to emit malformed tokens.

## Consequences

- Every access token the library issues under OIDC is uniformly a valid OIDC access token, usable at UserInfo, regardless of grant.
- The combination stays unadvertised: a discovery-driven RP never selects implicit. The fix is correctness insurance, not an endorsement of the flow.
- Reversing this later (stripping `at+jwt` from implicit) would be a token-format change for any implicit+OIDC consumer.
