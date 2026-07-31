# Grill: v5 security-hardening branch
_Status: resolved · handoff ready (see security-hardening-handoff.md)_

Source audit: `scratchpad/report-security.md` (0 Crit · 1 High · 6 Med · 7 Low). Branch: `jason/fix/security-hardening` off origin/main (a41d5db).

## Decisions
- **Scope tier** — chose **B**: release-gate (H-1, M-1, M-6, L-6) + free-because-pre-release (M-5) + no-API-debate lows (L-1, L-2, L-5). Because H-1 blocks v5.0.0 final and the rest is either free now (M-5 removes brand-new surface) or needs no public-API decision. Rejected A (too minimal — leaves free pre-release wins on the table) and C (opt-in hooks M-2/M-4/M-3 carry their own API-shape design nodes that would gate the H-1 release).

- **v4 coverage** — chose **B**: cut `jason/fix/security-hardening-v4` off tag v4.3.6 carrying the exploitable set H-1, M-1 + cheap-porting lows L-1, L-2, L-5, L-6. Release as v4.3.7. Because SECURITY.md commits to 4.x security updates and v4.3.6 is npm `latest` (the actual installed base) while carrying a High. Rejected A (v5-only, contradicts policy, leaves installed base exposed) and C (full backport + 3.x/2.x archaeology — deferred). M-5/M-6 are OIDC-only, not in v4 (N/A).

- **H-1 fix depth** — chose **L1 + L2, unconditional**. L1 = signed `validatedPayload.code_challenge` is the authority (`challenge = validatedPayload.code_challenge ?? authCode.codeChallenge`; cross-check both-present-differ → invalid_grant); fixes JWT mode's two-source problem. L2 = `if (requiresPKCE && !challenge) throw invalid_grant` at redemption; closes opaque mode + defense-in-depth. No opt-out flag (a switch to re-open a vuln is an attractive nuisance; L2 is symmetric with the /authorize:287 gate so it breaks no library-issued flow). Rejected L1-only (leaves opaque mode fail-open).
- **Unconditional guards** — H-1 L2 and M-1 isClientValid guard both unconditional (no escape hatch).
- **ADR + docs for H-1** — write ADR 0009 (PKCE enforcement authority); update repositories.md that getByIdentifier MUST round-trip codeChallenge/codeChallengeMethod (opaque-mode authority).

- **M-5 UserInfo token** — chose **drop query, keep header + body**. Remove userinfo.ts:27-28 (query `access_token` leaks into logs/history/Referer). Body form kept (legit RFC 6750 §2.2, non-leaking). Rejected header-only (little security gain for real POST-body interop cost).

- **Mechanics batch (M-1, M-6, L-1, L-2, L-5, L-6)** — accepted as specified. L-2 = **verified-first only** (resolve() verified first, unverifiedDecode fallback only on key-rotation verify failure); full-closure persisted-client compare rejected as too invasive for a Low.
- **v4 release framing** — ship v4 subset as **v4.3.7**; **skip GHSA for now** (may revisit).

## Open questions
- (none — all load-bearing nodes resolved)

## Assumptions to validate
- 3.x/2.x backports deferred despite SECURITY.md listing them (captured idea below).

## Research
- (none yet)

## Captured ideas (out of scope)
- **M-2 audience allow-list hook** — `validateAudience?(aud, client, grantType)` / `client.allowedAudiences`; default-off. Confused-deputy across resource servers sharing scope names. Own branch, own API grill.
- **M-4 canIntrospect hook** — `canIntrospect?(client, token)`; RFC 7662 ownership. Default = today's behavior. Own branch.
- **M-3 atomic auth-code consume** — optional `authCodeRepository.consume?(): Promise<boolean>` (conditional UPDATE ... WHERE revoked=false RETURNING) + reorder revoke ahead of issuance. Closes TOCTOU. Own branch (new repo seam = API decision).
