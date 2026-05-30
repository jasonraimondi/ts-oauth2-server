# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **OpenID Connect (OIDC) support.** Opt in by setting the top-level `issuer` and a nested `oidc` config block (with an RS256 `JwtService`). The authorization-code flow then issues a signed `id_token` alongside the access token, and three new endpoints become available: `authorizationServer.userInfo(req)`, `authorizationServer.openidConfiguration()`, and `authorizationServer.jwks()`. Access-token verification for UserInfo runs through a reusable `AccessTokenVerifier` seam. See the [OIDC getting-started guide](https://tsoauth2server.com/docs/oidc/getting_started) and [upgrade guide](https://tsoauth2server.com/docs/upgrade_guide). The individual building blocks are listed below.
- Add RS256 `JwtService` key options with public JWKS export and RFC 7638 thumbprint `kid` defaults.
- Add `OAuthException.invalidToken()` and `OAuthException.insufficientScope()` helpers for OIDC bearer-token responses.
- Add the optional `oidc` authorization-server config block, construction guards, `jwks()` endpoint response, and reusable `AccessTokenVerifier` seam.
- Add OIDC Core §5.4 scope-to-claim mapping and scope-gated claim filtering helpers.
- Thread OIDC `nonce`, `auth_time`, and `max_age` through the authorization request, auth code entity, and payload for both JWT and opaque codes, with a fail-loud guard when an opaque-code repository drops the persisted `nonce` and `max_age` freshness enforcement at token time.
- Issue a signed `id_token` alongside the access token in the authorization code flow when the `openid` scope is granted, carrying `iss`, `sub`, `aud`, `exp`, `iat`, conditional `nonce`/`auth_time`, and `at_hash`. Adds `buildIdTokenClaims`, `calculateAtHash`, and `oidcSubjectIdentifier` helpers, and auto-recognizes the standard OIDC scopes (`openid`, `profile`, `email`, `address`, `phone`) when OIDC is enabled.
- Add the optional `getIdTokenClaims` OIDC hook for adding custom claims (e.g. roles, tenant, acr) to issued ID tokens. An explicit strip-then-merge against the exported `PROTOCOL_CLAIM_NAMES` constant guarantees protocol claims always win and hook output reaches the JWT payload only, never the JOSE header; a throwing hook surfaces as `invalid_grant`.

### Changed
- **BREAKING**: Raise the minimum supported Node.js runtime to 22.
- When OIDC is enabled, authorization-code access tokens now carry the JOSE header `typ: "at+jwt"` (RFC 9068). The `BearerTokenResponse` body gains an optional `id_token` string for OIDC `openid` flows. Non-OIDC token wire format is unchanged.
- `JwtService.verify()` now pins verification to the service's configured algorithm and ignores caller-supplied `algorithms` options. It also rejects any token whose payload is not a JSON object (the method has always declared a `Record<string, unknown>` return), so a string-payload JWT no longer resolves with the raw string.
- `JwtService.sign()` now forwards signing options, including JOSE header overrides such as `typ: "at+jwt"`.
- Internal: stop importing the removed `crypto.JsonWebKey` type (dropped in `@types/node` v25); the RSA JWK export is now typed against a small local interface so `tsc` passes. No public API or runtime change.

### Known limitations (OIDC v1)
- No `id_token` is issued on the refresh-token grant — only in the authorization-code exchange.
- No `offline_access` auto-recognition; refresh-token issuance stays consumer-owned.
- RS256 only — ES256 and overlapping multi-key rotation are deferred (a single-key model cannot satisfy OIDC Discovery §3 with an ES256 key).
- UserInfo returns plain JSON only; signed/encrypted UserInfo responses are not supported.
- Opaque authorization codes require the consumer repository to persist `nonce`/`auth_time`; JWT authorization codes are recommended for OIDC.

## [4.3.5] - 2026-05-08

### Fixed
- Published `exports` field pointed at `./src/*.ts` instead of compiled `./dist/*.js`, breaking every subpath import (root, `/vanilla`, `/express`, `/fastify`, `/h3`) for consumers of 4.3.3 and 4.3.4. Root cause: commit 197a400 switched the publish workflow from `pnpm publish` to `npm publish` to use OIDC trusted publishing, but npm ignores `publishConfig.exports`, so the development-time exports (pointing at `src` for vitest self-imports) leaked into the published artifact. Reverted to `pnpm publish` (pnpm 11.0.7+ supports OIDC trusted publishing). Reported by [@tobiasdcl](https://github.com/tobiasdcl) ([#228](https://github.com/jasonraimondi/ts-oauth2-server/issues/228)).

### Changed
- Internal: use `import type` for `OAuthTokenIntrospectionResponse` in `client_credentials.grant.ts` to keep it erased from the JS bundle.

## [4.3.4] - 2026-04-25

### Chore
- Add `repository.url` to `package.json` for npm metadata.

## [4.3.3] - 2026-04-25

### Chore
- CI: switch npm publish to OIDC trusted publishing.

## [4.3.2] - 2026-04-25

### Fixed
- Build: re-export `AuthorizationServerOptions` and `GrantIdentifier` with the `type` modifier. Rolldown rejects value re-exports for type-only symbols, which broke `pnpm build` (and the `prepublishOnly` hook on v4.3.1, blocking the npm + JSR publish).

### Chore
- CI: bump `.node-version` to 22.12.0 to satisfy rolldown's engine constraint (`^20.19.0 || >=22.12.0`); the previous 20.12.2 caused pnpm to skip the `@rolldown/binding-linux-x64-gnu` optional dep, breaking the publish workflow.

## [4.3.1] - 2026-04-25

### Added
- Re-export `LoggerService` and `ConsoleLoggerService` from the package entry with JSDoc on wiring into `AuthorizationServer`.

### Changed
- Internal: extract opaque-vs-JWT branching into `AuthCodeEncoder` and `RefreshTokenEncoder` strategies. Subclass overrides of `encrypt`/`decrypt`/`encryptRefreshToken` hooks still participate.
- Internal: unexport six unreachable encoder helper types; emitted `.d.ts` unchanged.
- Internal: move `AuthorizationServerOptions` to `src/options.ts` and `GrantIdentifier` to its own leaf file to break circular imports (10 → 2). Both still re-exported from original locations.

### Fixed
- Opaque refresh token expiration check compared seconds to a `Date`, letting expired tokens through and rejecting non-expiring tokens (`refreshTokenExpiresAt: null`) ([#212](https://github.com/jasonraimondi/ts-oauth2-server/issues/212)).
- JWT auth code resolve now rejects payloads missing `auth_code_id`, `client_id`, finite `expire_time`, or string-array `scopes`. Previously missing `expire_time` silently failed open. Revoke's `unverifiedDecode` path stays lenient per RFC 7009.

### Chore
- Bump deps: TypeScript 6, Vitest 4, Vite 8, Express 5, Fastify 5, body-parser 2, plus `@types/*`, `prettier`, `tsdown`. TS6 adjustments: drop `baseUrl`, enable `skipLibCheck`, narrow `URLSearchParams` and `ms()` call sites. h3 stays on 1.15.11 (2.x still RC).

## [4.3.0] - 2026-02-23

### Added
- Add `implicitRedirectMode` option for fragment-based redirects
- Add h3 adapter entrypoint and tests

### Changed
- Migrate bundler from tsup to tsdown

### Fixed
- Use finalized scopes when encrypting implicit grant access token

## [4.2.2] - 2025-12-04

### Fixed
- Prevent crashes from generic repository errors in adapters

## [4.2.1] - 2025-12-03

### Fixed
- Missing finalize calls in AuthorizationCodeGrant, ImplicitGrant, and TokenExchangeGrant

## [4.2.0] - 2025-10-31

### Added
- Support for opaque refresh tokens
- originatingAuthCodeId now provided as argument to extraTokenFields callback

### Fixed
- originatingAuthCodeId now properly populated during RefreshTokenGrant
- originatingAuthCodeId now properly populated before calling tokenRepository.persist

## [4.1.1] - 2025-10-20

### Fixed
- Reset originatingAuthCodeId in refresh_token scope test
- Package version bump for patch release

## [4.1.0] - 2025-10-19

### Added
- Support for opaque authorization codes
- Documentation for `useOpaqueAuthorizationCodes` option
- Agent for answering questions
- Expanded FAQ on token validation and errors
- Logger documentation improvements

### Fixed
- Null safety checks for opaque authorization code validation
- Token validation documentation to use jti claim

## [4.0.11] - 2025-09-20

### Added
- Optional logger support for debugging token operations, revocations, and grant processing errors

### Fixed
- Missing validation parameters in `getUserByCredentials` calls in authorization code grant
- Client ownership validation for token revocation per RFC 7009
- Duplicate dts keys in tsup build configuration

### Security
- Enhanced validation for client ownership during token revocation

## [4.0.10] - 2025-08-04

### Fixed
- Content-type header handling for charset parameters normalization
- URL-encoded body parsing improvements

## [4.0.9] - 2025-08-04

### Fixed
- Allow empty client secrets in basic authentication

## [4.0.8] - 2025-08-04

### Fixed
- Unauthorized client and scope exceptions now correctly throw 401 instead of 400
- Missing finalize scopes in client credentials and refresh token grants

## [4.0.7] - 2025-06-25

### Fixed
- Express adapter build errors from response status handling

## [4.0.6] - 2025-06-20

### Fixed
- Introspect and revoke endpoints now return falsey values instead of throwing for invalid tokens (per OAuth spec)
- Token revocation inconsistencies to match OAuth spec RFC 7009

## [4.0.5] - 2025-06-05

### Fixed
- RequestFromVanilla headers handling
- Swallowed exceptions from improper exports in adapters

## [4.0.4] - 2025-06-04

### Fixed
- Crypto imports to use direct crypto instead of node:crypto
- Vanilla adapters added to JSR exports
- Method check removed for requestFromVanilla
- GET method implementation
- Audience claim now supports string array or single string value
- Custom grant prefix override capability

## [4.0.3] - 2025-03-28

### Fixed
- Various bug fixes and improvements

## [4.0.2] - 2024-08-24

### Fixed
- Various bug fixes and improvements

## [4.0.1] - 2024-08-12

### Fixed
- Various bug fixes and improvements

## [4.0.0] - 2024-08-11

### Added
- Support for token introspection with client credentials authentication
- Custom scope delimiter support
- More explicit error messages when client is determined to be invalid
- Automatic enabling of client_credentials and refresh_token grants
- Optional status parameter in OAuth response constructor
- Guard utility function against invalid client scopes
- Export of isOAuthError helper function

### Changed
- **BREAKING**: Default authentication with client_credentials for introspect and revoke endpoints
- Configuration options renamed to `authenticateIntrospect` & `authenticateRevoke`

### Security
- Enhanced default security for introspect and revoke endpoints requiring client authentication

## [3.6.0] - 2024-08-11

### Added
- Configuration option for toggling revoke and introspect authentication
- Nuxt documentation

### Changed
- Preparation for v4.0.0 authentication defaults

## [3.5.0] - 2024-01-01

### Added
- Various feature improvements

## [3.4.1] - 2024-01-01

### Fixed
- Various bug fixes

## [3.4.0] - 2024-01-01

### Added
- Various feature improvements

## [3.3.1] - 2024-01-01

### Fixed
- Various bug fixes

## [3.3.0] - 2024-01-01

### Added
- Various feature improvements

## [3.2.0] - 2024-01-01

### Added
- Various feature improvements

## [3.1.0] - 2024-01-01

### Added
- Various feature improvements

## [3.0.4] - 2024-01-01

### Fixed
- Various bug fixes

## [3.0.2] - 2024-01-01

### Fixed
- Various bug fixes

## [3.0.1] - 2024-01-01

### Fixed
- Various bug fixes

## [3.0.0] - 2024-01-01

### Added
- Docusaurus documentation site refactor
- Vanilla adapter for framework-agnostic usage
- responseToVanilla adapter
- JSR.json file for JSR (JavaScript Registry) support
- Support for issuer and audience in extraParams
- Custom grants support
- Token-exchange grant type (RFC 8693)
- Redirect URI with port support

### Changed
- **BREAKING**: Remove setOptions method
- **BREAKING**: Add options as grant constructor argument
- Default options system implementation
- More explicit imports for better tree-shaking

### Fixed
- Various improvements and bug fixes

## [2.6.1] - 2023-01-01

### Fixed
- Various bug fixes

## [2.6.0] - 2023-01-01

### Added
- Various feature improvements

## [2.5.0] - 2023-01-01

### Added
- Various feature improvements

## [2.4.0] - 2023-01-01

### Added
- Various feature improvements

## [2.3.0] - 2023-01-01

### Added
- Various feature improvements

## [2.2.5] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.4] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.3] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.2] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.1] - 2023-01-01

### Fixed
- Various bug fixes

## [2.2.0] - 2023-01-01

### Added
- Various feature improvements

## [2.1.0] - 2023-01-01

### Added
- Various feature improvements

## [2.0.5] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.4] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.3] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.2] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.1] - 2023-01-01

### Fixed
- Various bug fixes

## [2.0.0] - 2023-01-01

### Added
- Various feature improvements

### Changed
- **BREAKING**: Major version upgrade with significant changes

## [1.3.0] - 2022-01-01

### Added
- Various feature improvements

## [1.2.0] - 2022-01-01

### Added
- Various feature improvements

## [1.1.1] - 2022-01-01

### Fixed
- Various bug fixes

## [1.1.0] - 2022-01-01

### Added
- Various feature improvements

## [1.0.4] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.3] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.2] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.1] - 2022-01-01

### Fixed
- Various bug fixes

## [1.0.0] - 2022-01-01

### Added
- Initial stable release
- Complete OAuth 2.0 authorization server implementation
- Support for multiple grant types (authorization_code, client_credentials, password, implicit, refresh_token)
- Framework adapters for Express and Fastify
- Repository pattern for data persistence
- Comprehensive test suite

### Security
- RFC-compliant OAuth 2.0 implementation
- PKCE (Proof Key for Code Exchange) support
- JWT token handling with proper validation
