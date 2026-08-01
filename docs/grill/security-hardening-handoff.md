# Implementation handoff: v5 + v4 security hardening

Decision log: `security-hardening.md`. Audit source: `scratchpad/report-security.md`.
Two branches, both fixes-first (write a failing test, then fix). No breaking public API.

## Scope (tier B) — findings and where each lands

| ID | Fix | v5 branch | v4.3.7 branch |
|----|-----|:--:|:--:|
| H-1 | PKCE authority = signed payload (L1) + fail-closed when `requiresPKCE` & no challenge (L2) | ✅ | ✅ |
| M-1 | Implicit grant calls `isClientValid` (enforce `allowedGrants`) | ✅ | ✅ |
| M-6 | `AccessTokenVerifier` asserts `exp`/`nbf` | ✅ | — (OIDC new in v5) |
| M-5 | UserInfo: drop query-string token, keep header + body | ✅ | — (OIDC new in v5) |
| L-1 | Timing-safe compares (S256, plain, code-challenge equality) | ✅ | ✅ |
| L-2 | Revoke ownership via verified `resolve()` first, unverified fallback only on key-rotation | ✅ | ✅ |
| L-5 | Adapters: generic 500 message, no echo of internal `e.message` | ✅ | ✅ |
| L-6 | `getByIdentifier`→`undefined` throws `invalid_client`, not a 500 | ✅ | ✅ |

Deferred (captured ideas — separate branches, own API grills): M-2 `validateAudience` hook, M-4 `canIntrospect` hook, M-3 atomic `consume?()` seam. L-7 (example plaintext secret) lives on the example branch already.

## Acceptance criteria
- **H-1:** a JWT-mode code whose repository row omits `codeChallenge` still requires a valid `code_verifier` (PKCE not skippable). When `requiresPKCE` and no challenge is discoverable in either source, redemption fails `invalid_grant`. Signed and row challenge differing → `invalid_grant`. Existing PKCE happy-path tests unchanged.
- **M-1:** `/authorize?response_type=token` for a client without `implicit` in `allowedGrants` → `unauthorized_client`.
- **M-6:** an expired (or `nbf`-future) `at+jwt` presented to `AccessTokenVerifier.verify` → `invalid_token`, independent of the injected `JwtInterface`.
- **M-5:** `GET /userinfo?access_token=…` no longer authenticates; header and POST-body still do.
- **L-1/L-2/L-5/L-6:** behavior unchanged for valid inputs; the specific weakness closed (no `===` on secrets/challenges; forged unverified revoke rejected; 500s carry no internal text; missing client → `invalid_client`).
- Full `pnpm test:cov` green on both branches; coverage ≥ the branch's own baseline (v5 off main: stmts 93.39 / br 86.87 / fn 94.34 / ln 94.07); `pnpm build` green.

## Approach
`jason/fix/security-hardening` off `origin/main` (a41d5db) carries all eight; `jason/fix/security-hardening-v4` off `tags/v4.3.6` carries the six that exist in v4, re-implemented against v4 source (no encoder split, `validateClient` only, different adapter shapes) — released as **v4.3.7**, no GHSA for now. Each fix is strictly additive (adds rejections / removes a source); none changes a public signature.

## Files & patterns
- `src/grants/auth_code.grant.ts:153-192` — H-1 in `validateCodeChallenge`; gate on `challenge = validatedPayload.code_challenge ?? authCode.codeChallenge`; keep both-present cross-check; add `requiresPKCE && !challenge` fail-closed.
- `src/grants/implicit.grant.ts:34-38` — M-1 guard after the `!client` check; `isClientValid` is on `OAuthClientRepository` (used by every other grant).
- `src/oidc/access_token_verifier.ts:76-80` — M-6 after the `iss` check; `now = Math.floor(Date.now()/1000)`.
- `src/oidc/userinfo.ts:27-28` — M-5 remove the query branch only.
- `src/code_verifiers/S256.verifier.ts:11`, `plain.verifier.ts:7`, `auth_code.grant.ts:162` — L-1 `crypto.timingSafeEqual` with length-equality guard.
- `src/grants/client_credentials.grant.ts` revoke path + `auth_code.grant.ts` revoke helpers — L-2 verified-first.
- `src/adapters/{express,fastify,h3,vanilla}.ts` (500 branch) — L-5 generic message.
- `src/grants/abstract/abstract.grant.ts` `validateClient`/`validateClientIdentity` — L-6 null-guard.
- `docs/adr/0009-pkce-enforcement-authority.md` — new ADR (follow 0006-0008 format).
- `docs/docs/getting_started/repositories.md` — state `authCodeRepository.getByIdentifier` MUST round-trip `codeChallenge`/`codeChallengeMethod`; `clientRepository.getByIdentifier` MUST throw (not resolve `undefined`).
- `CHANGELOG.md` (both branches) — security section; v4.3.7 entry.
- Move `docs/grill/*` onto the v5 branch at implementation start (currently on the docs branch working tree).

## Interfaces
No public interface changes. Internal only:
```ts
// auth_code.grant.ts
private validateCodeChallenge(authCode, validatedPayload, req): void  // logic change, same signature
// no new options, no new repository methods (verified-first L-2 uses existing resolve())
```

## Constraints & non-goals
- Constraint: no public API/signature/interface change; additive-only; strict TS, no `any`, `.js` imports, snake_case files.
- Constraint: all guards unconditional — no opt-out flags.
- Constraint: fixes-first (failing test → fix) per finding.
- Non-goal: M-2/M-4/M-3 hooks; 3.x/2.x backports; GHSA; the example plaintext-secret L-7 (example branch).

## Tasks (ordered)
1. Create `jason/fix/security-hardening` off `origin/main`; move grill docs onto it → verify: branch builds.
2. H-1 test (JWT row-omits-challenge still requires verifier; requiresPKCE+no-challenge → invalid_grant; mismatch → invalid_grant) → fix → verify: red→green, happy-path PKCE tests still pass.
3. M-1 → M-6 → M-5 → L-6 → L-1 → L-2 → L-5, each test-first → verify: red→green.
4. ADR 0009 + repositories.md + CHANGELOG → verify: `pnpm build` (docs typecheck), links resolve.
5. Full `pnpm test:cov` + `pnpm build` → verify: green, coverage ≥ baseline.
6. Create `jason/fix/security-hardening-v4` off `tags/v4.3.6`; re-implement H-1, M-1, L-1, L-2, L-5, L-6 against v4 source (confirm v4 JWT-mode exposes both signed+row challenge sources before applying H-1 L1) → verify: v4 `pnpm test` green; bump to v4.3.7 + CHANGELOG.

## Tests required
- H-1: JWT-mode row missing `codeChallenge` + no `code_verifier` → reject; + valid verifier → still verified against signed challenge; `requiresPKCE=true` & neither source has a challenge → `invalid_grant`; signed≠row → `invalid_grant`; `requiresPKCE=false` & no challenge → still succeeds (no regression); opaque-mode happy path unchanged.
- M-1: disallowed-implicit client rejected; allowed client unaffected.
- M-6: expired `at+jwt` and future-`nbf` rejected even with a permissive stub `JwtInterface`.
- M-5: query-string token rejected; header and body accepted.
- L-1: correct verifier still verifies; wrong one still fails (behavioral parity).
- L-2: forged unverified revoke (attacker client_id) rejected; legitimate key-rotation revoke still succeeds.
- L-5: forced non-OAuth throw → response body has no internal message.
- L-6: `getByIdentifier` resolving `undefined` → `invalid_client`, not 500.

## Still needs a human
- GHSA for H-1 — deferred ("skip for now"); revisit before/after v4.3.7 ships.
- 3.x/2.x backports — deferred despite SECURITY.md listing them.
- Release choreography — how the five audit branches (security-v5, security-v4, tests, docs, example) sequence/stack and merge order. Not decided in this grill.
