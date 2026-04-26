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
- Optional logger for token ops, revocations, grant errors
- RFCs: 6749, 6750, 7009, 7519, 7636, 7662, 8693

## Tests
- Unit: `test/unit/` — E2E: `test/e2e/` (by grant + adapter) — Setup: `test/setup.ts`
- Coverage excludes: `.github`, `.idea`, `docs`, `example`
