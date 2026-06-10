# CLAUDE.md

TypeScript OAuth 2.0 authorization server library. Framework-agnostic core with adapters.

## Commands
- `pnpm build` / `pnpm test` / `pnpm test:watch` / `pnpm test:cov` / `pnpm format`
- Single test: `pnpm vitest run path/to/file.spec.ts`

## Code Style
- TS strict mode; explicit param/return types; no `any`
- Imports use `.js` extension; named imports/exports only (no default, no barrels)
- Naming: files `snake_case.ts`, classes `PascalCase`, vars/fns `camelCase`
- Errors: throw `OAuthException` with specific error types
- Tests: Vitest `describe`/`it`

## Breaking Changes (CRITICAL)
Published library — never change public APIs/signatures/interfaces. Add new features as optional params with defaults. Extend, don't modify. Prefer keeping deprecated code over removal.

## Docs
Update https://tsoauth2server.com/ and this file when behavior or architecture changes.

## Architecture
- `AuthorizationServer` orchestrates flows
- Grants (`AbstractGrant` subclasses): authorization_code, client_credentials, password, implicit, refresh_token, token_exchange
- Repository pattern for all persistence (client, token, user, scope, auth_code) — implemented by consumers
- Adapters: `./vanilla`, `./express`, `./fastify` (entry points in `package.json`)
- PKCE verifiers: Plain, S256
- Redirect URIs: exact match after URL normalization (RFC 6749 §3.1.2.3); only loopback hosts (`localhost`, `127.0.0.1`, `[::1]`) may vary the port (RFC 8252 §7.3); explicit `redirect_uri` required unless exactly one URI is registered (see `docs/adr/0007`)
- Optional logger for token ops, revocations, grant errors
- Introspect/revoke (shared handler in `ClientCredentialsGrant`): claims trusted only after `jwt.verify` (exp/nbf ignored — `active` derives from stored state); `token_type_hint` is advisory, dispatch is by verified payload shape; opaque refresh tokens resolve via the `RefreshTokenEncoder`; introspection `active` folds in `isRefreshTokenRevoked`/optional `isAccessTokenRevoked`; persisted fields win over echoed claims (docs/adr/0008)
- RFCs: 6749, 6750, 7009, 7519, 7636, 7662, 8693, 9068; OpenID Connect Core 1.0

### OIDC layer (`src/oidc/`)
- Opt-in via top-level `issuer` + nested `oidc` block on `AuthorizationServerOptions`; requires an RS256 `JwtService`. Absent the block, non-OIDC flows are unchanged.
- Endpoint methods on `AuthorizationServer`: `jwks()`, `openidConfiguration()`, `userInfo(req)`; the auth-code grant adds an `id_token` to the token response when the `openid` scope is granted.
- `AccessTokenVerifier` seam: the single home for OIDC access-token verification (algorithm pin → `typ: at+jwt` check → signature → `iss` equality). It owns these checks regardless of which `JwtInterface` the consumer supplies, so a custom `JwtInterface` that fails to pin algorithms cannot weaken UserInfo; it is also unit-testable and reusable by resource-server adapters.
- Consumer hooks: `getUserClaims` (scope-filtered UserInfo claims) and optional `getIdTokenClaims` (custom ID-token claims, protocol claims protected by `PROTOCOL_CLAIM_NAMES`).
- Opaque auth codes rebuild their payload from the persisted entity, so consumers must persist `nonce`/`authTime`; a fail-loud guard rejects with `invalid_grant` otherwise.
- OIDC scope auto-recognition (`openid`/`profile`/`email`/…) is gated to the `authorization_code` grant; other grants reject unregistered OIDC scopes as `invalid_scope`.
- UserInfo revocation: deletion/expiry is detected via `getByAccessToken`; flag-based revocation (live row, future expiry, marked revoked) needs the optional `isAccessTokenRevoked?` on `OAuthTokenRepository`.

## Tests
- Unit: `test/unit/` — E2E: `test/e2e/` (by grant + adapter) — Setup: `test/setup.ts`
- Coverage excludes: `.github`, `.idea`, `docs`, `example`
